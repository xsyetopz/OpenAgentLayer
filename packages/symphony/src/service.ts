import {
	claimIssue,
	createOrchestratorState,
	eligibleIssues,
	normalizedSet,
	normalizeState,
	releaseIssue,
	scheduleRetry,
} from "./scheduler";
import type {
	AgentRunResult,
	Issue,
	OrchestratorState,
	SymphonyAgentRunner,
	SymphonyConfig,
	SymphonyLogEntry,
	SymphonyLogger,
	SymphonyTrackerClient,
	WorkflowDefinition,
} from "./types";
import { loadWorkflow, renderPrompt, resolveConfig } from "./workflow";
import {
	ensureWorkspace,
	type HookRunner,
	removeWorkspace,
	runShellHook,
} from "./workspace";

export interface SymphonyServiceOptions {
	workflowPath?: string;
	tracker: SymphonyTrackerClient;
	runner: SymphonyAgentRunner;
	logger?: SymphonyLogger;
	nowMs?: () => number;
	hookRunner?: HookRunner;
}

export class SymphonyService {
	readonly state: OrchestratorState;
	readonly #options: SymphonyServiceOptions;
	#workflow: WorkflowDefinition | null = null;
	#config: SymphonyConfig;
	#timer: ReturnType<typeof setInterval> | null = null;
	#inflight = new Set<Promise<void>>();

	constructor(options: SymphonyServiceOptions) {
		this.#options = options;
		const fallback = resolveConfig(
			{
				config: {
					tracker: {
						kind: "linear",
						api_key: "local",
						project_slug: "unset",
					},
				},
				prompt_template: "",
			},
			{},
		);
		this.#config = fallback;
		this.state = createOrchestratorState(fallback);
	}

	get config(): SymphonyConfig {
		return this.#config;
	}

	get workflow(): WorkflowDefinition | null {
		return this.#workflow;
	}

	async start(): Promise<void> {
		await this.reload();
		await this.cleanupTerminalWorkspaces();
		await this.tick();
		this.#reschedule();
	}

	async stop(): Promise<void> {
		if (this.#timer) clearInterval(this.#timer);
		this.#timer = null;
		for (const issueId of this.state.running.keys())
			await this.#options.runner.cancel?.(issueId);
		await Promise.allSettled([...this.#inflight]);
	}

	async reload(): Promise<void> {
		const workflow = await loadWorkflow(this.#options.workflowPath);
		const config = resolveConfig(workflow);
		this.#workflow = workflow;
		this.#config = config;
		this.state.poll_interval_ms = config.polling.interval_ms;
		this.state.max_concurrent_agents = config.agent.max_concurrent_agents;
		if (this.#timer) this.#reschedule();
		this.#log({ level: "info", event: "workflow_reloaded" });
	}

	async tick(): Promise<void> {
		try {
			await this.reload();
		} catch (error) {
			this.#log({
				level: "error",
				event: "workflow_reload_failed",
				message: String(error),
			});
		}
		await this.reconcile();
		const workflow = this.#workflow;
		if (!workflow) return;
		await this.#dispatchDueRetries(workflow);
		let candidates: Issue[];
		try {
			candidates = await this.#options.tracker.fetchCandidateIssues(
				this.#config,
			);
		} catch (error) {
			this.#log({
				level: "error",
				event: "candidate_fetch_failed",
				message: String(error),
			});
			return;
		}
		for (const issue of eligibleIssues(candidates, this.#config, this.state))
			this.#startWorker(issue, workflow, null);
	}

	async reconcile(): Promise<void> {
		const runningIds = [...this.state.running.keys()];
		if (runningIds.length === 0) return;
		const nowMs = this.#nowMs();
		for (const [issueId, running] of this.state.running.entries()) {
			const last = running.last_codex_timestamp ?? running.started_at;
			if (
				this.#config.codex.stall_timeout_ms > 0 &&
				nowMs - last > this.#config.codex.stall_timeout_ms
			) {
				await this.#options.runner.cancel?.(issueId);
				this.state.retry_attempts.set(
					issueId,
					scheduleRetry(this.#config, running.issue, 1, nowMs, "stalled"),
				);
			}
		}
		let states: Issue[];
		try {
			states = await this.#options.tracker.fetchIssueStates(
				runningIds,
				this.#config,
			);
		} catch (error) {
			this.#log({
				level: "warn",
				event: "reconcile_state_refresh_failed",
				message: String(error),
			});
			return;
		}
		const byId = new Map(states.map((issue) => [issue.id, issue]));
		const active = normalizedSet(this.#config.tracker.active_states);
		const terminal = normalizedSet(this.#config.tracker.terminal_states);
		for (const [issueId, running] of this.state.running.entries()) {
			const current = byId.get(issueId);
			if (!current) continue;
			running.issue = current;
			const state = normalizeState(current.state);
			if (terminal.has(state)) {
				await this.#options.runner.cancel?.(issueId);
				await removeWorkspace(this.#config, current, this.#options.hookRunner);
				releaseIssue(this.state, issueId);
			} else if (!active.has(state)) {
				await this.#options.runner.cancel?.(issueId);
				releaseIssue(this.state, issueId);
			}
		}
	}

	async cleanupTerminalWorkspaces(): Promise<void> {
		try {
			for (const issue of await this.#options.tracker.fetchTerminalIssues(
				this.#config,
			))
				await removeWorkspace(this.#config, issue, this.#options.hookRunner);
		} catch (error) {
			this.#log({
				level: "warn",
				event: "terminal_workspace_cleanup_failed",
				message: String(error),
			});
		}
	}

	async drain(): Promise<void> {
		await Promise.allSettled([...this.#inflight]);
	}

	#startWorker(
		issue: Issue,
		workflow: WorkflowDefinition,
		attempt: number | null,
	): void {
		if (!this.state.claimed.has(issue.id)) claimIssue(this.state, issue);
		const work = this.#runWorker(issue, workflow, attempt).finally(() => {
			this.#inflight.delete(work);
		});
		this.#inflight.add(work);
	}

	async #dispatchDueRetries(workflow: WorkflowDefinition): Promise<void> {
		const nowMs = this.#nowMs();
		for (const retry of [...this.state.retry_attempts.values()]) {
			if (retry.due_at_ms > nowMs) continue;
			let candidates: Issue[];
			try {
				candidates = await this.#options.tracker.fetchCandidateIssues(
					this.#config,
				);
			} catch (error) {
				this.state.retry_attempts.set(retry.issue_id, {
					...retry,
					attempt: retry.attempt + 1,
					due_at_ms:
						nowMs +
						Math.min(
							10000 * 2 ** retry.attempt,
							this.#config.agent.max_retry_backoff_ms,
						),
					error: `retry poll failed: ${String(error)}`,
				});
				continue;
			}
			const issue = candidates.find(
				(candidate) => candidate.id === retry.issue_id,
			);
			if (!issue) {
				releaseIssue(this.state, retry.issue_id);
				continue;
			}
			if (
				eligibleIssues([issue], this.#config, this.state, {
					allowClaimedIssueId: retry.issue_id,
				}).length === 0
			) {
				this.state.retry_attempts.set(retry.issue_id, {
					...retry,
					attempt: retry.attempt + 1,
					due_at_ms: nowMs + 1000,
					error: "no available orchestrator slots",
				});
				continue;
			}
			this.state.retry_attempts.delete(retry.issue_id);
			this.#startWorker(issue, workflow, retry.attempt);
		}
	}

	async #runWorker(
		initialIssue: Issue,
		workflow: WorkflowDefinition,
		attempt: number | null,
	): Promise<void> {
		let issue = initialIssue;
		let lastSessionId: string | undefined;
		const workspace = await ensureWorkspace(
			this.#config,
			issue,
			this.#options.hookRunner,
		);
		this.state.running.set(issue.id, {
			issue,
			started_at: this.#nowMs(),
			last_codex_timestamp: null,
		});
		try {
			if (this.#config.hooks.before_run)
				await (this.#options.hookRunner ?? runShellHook)(
					this.#config.hooks.before_run,
					workspace.path,
					this.#config.hooks.timeout_ms,
				);
			for (let turn = 1; turn <= this.#config.agent.max_turns; turn += 1) {
				const prompt =
					workflow.prompt_template.length === 0
						? "You are working on an issue from Linear."
						: renderPrompt(workflow.prompt_template, issue, attempt);
				const result = await this.#options.runner.run({
					issue,
					attempt,
					turn,
					workspace,
					workflow,
					config: this.#config,
					prompt,
				});
				this.#applyRunResult(result);
				lastSessionId = result.session_id ?? lastSessionId;
				if (result.status !== "succeeded")
					throw new Error(result.error ?? result.status);
				const [current] = await this.#options.tracker.fetchIssueStates(
					[issue.id],
					this.#config,
				);
				if (!current) break;
				issue = current;
				const currentState = normalizeState(issue.state);
				if (
					!normalizedSet(this.#config.tracker.active_states).has(
						currentState,
					) ||
					normalizedSet(this.#config.tracker.terminal_states).has(currentState)
				)
					break;
			}
			this.state.retry_attempts.set(
				issue.id,
				scheduleRetry(this.#config, issue, 1, this.#nowMs(), null),
			);
			this.state.completed.add(issue.id);
			this.#log({
				level: "info",
				event: "worker_succeeded",
				issue_id: issue.id,
				issue_identifier: issue.identifier,
				session_id: lastSessionId,
			});
		} catch (error) {
			this.state.retry_attempts.set(
				issue.id,
				scheduleRetry(
					this.#config,
					issue,
					attempt ?? 1,
					this.#nowMs(),
					String(error),
				),
			);
			this.#log({
				level: "error",
				event: "worker_failed",
				issue_id: issue.id,
				issue_identifier: issue.identifier,
				session_id: lastSessionId,
				message: String(error),
			});
		} finally {
			if (this.#config.hooks.after_run)
				try {
					await (this.#options.hookRunner ?? runShellHook)(
						this.#config.hooks.after_run,
						workspace.path,
						this.#config.hooks.timeout_ms,
					);
				} catch (error) {
					this.#log({
						level: "warn",
						event: "after_run_hook_failed",
						issue_id: issue.id,
						issue_identifier: issue.identifier,
						session_id: lastSessionId,
						message: String(error),
					});
				}
			this.state.running.delete(issue.id);
		}
	}

	#applyRunResult(result: AgentRunResult): void {
		this.state.codex_totals.input_tokens += result.input_tokens ?? 0;
		this.state.codex_totals.output_tokens += result.output_tokens ?? 0;
		this.state.codex_totals.total_tokens += result.total_tokens ?? 0;
		this.state.codex_totals.runtime_seconds += result.runtime_seconds ?? 0;
		if (result.rate_limits !== undefined)
			this.state.codex_rate_limits = result.rate_limits;
	}

	#reschedule(): void {
		if (this.#timer) clearInterval(this.#timer);
		this.#timer = setInterval(() => {
			this.tick().catch((error) =>
				this.#log({
					level: "error",
					event: "poll_tick_failed",
					message: String(error),
				}),
			);
		}, this.#config.polling.interval_ms);
	}

	#nowMs(): number {
		return this.#options.nowMs?.() ?? Date.now();
	}

	#log(entry: SymphonyLogEntry): void {
		this.#options.logger?.(entry);
	}
}
