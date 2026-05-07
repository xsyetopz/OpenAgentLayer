import type {
	Issue,
	OrchestratorState,
	RetryEntry,
	SymphonyConfig,
} from "./types";

export function createOrchestratorState(
	config: SymphonyConfig,
): OrchestratorState {
	return {
		poll_interval_ms: config.polling.interval_ms,
		max_concurrent_agents: config.agent.max_concurrent_agents,
		running: new Map(),
		claimed: new Set(),
		retry_attempts: new Map(),
		completed: new Set(),
		codex_totals: {
			input_tokens: 0,
			output_tokens: 0,
			total_tokens: 0,
			runtime_seconds: 0,
		},
		codex_rate_limits: null,
	};
}

export function eligibleIssues(
	issues: Issue[],
	config: SymphonyConfig,
	state: OrchestratorState,
	options: { allowClaimedIssueId?: string } = {},
): Issue[] {
	const terminal = normalizedSet(config.tracker.terminal_states);
	const active = normalizedSet(config.tracker.active_states);
	const runningByState = new Map<string, number>();
	for (const entry of state.running.values()) {
		const stateKey = normalizeState(entry.issue.state);
		runningByState.set(stateKey, (runningByState.get(stateKey) ?? 0) + 1);
	}
	const globalSlots = Math.max(
		config.agent.max_concurrent_agents - state.running.size,
		0,
	);
	if (globalSlots === 0) return [];
	return issues
		.filter((issue) => {
			const issueState = normalizeState(issue.state);
			if (!(issue.id && issue.identifier && issue.title && issue.state))
				return false;
			if (!active.has(issueState) || terminal.has(issueState)) return false;
			if (state.running.has(issue.id)) return false;
			if (
				state.claimed.has(issue.id) &&
				issue.id !== options.allowClaimedIssueId
			)
				return false;
			if (
				issueState === "todo" &&
				issue.blocked_by.some(
					(blocker) =>
						blocker.state == null ||
						!terminal.has(normalizeState(blocker.state)),
				)
			)
				return false;
			const perStateLimit =
				config.agent.max_concurrent_agents_by_state[issueState] ??
				config.agent.max_concurrent_agents;
			return (runningByState.get(issueState) ?? 0) < perStateLimit;
		})
		.sort(compareIssues)
		.slice(0, globalSlots);
}

export function claimIssue(state: OrchestratorState, issue: Issue): void {
	if (state.claimed.has(issue.id) || state.running.has(issue.id))
		throw new Error(`Issue already claimed: ${issue.identifier}`);
	state.claimed.add(issue.id);
}

export function releaseIssue(state: OrchestratorState, issueId: string): void {
	state.claimed.delete(issueId);
	state.running.delete(issueId);
	state.retry_attempts.delete(issueId);
}

export function scheduleRetry(
	config: SymphonyConfig,
	issue: Issue,
	attempt: number,
	nowMs: number,
	error: string | null,
): RetryEntry {
	const delay =
		error == null
			? 1000
			: Math.min(
					10000 * 2 ** Math.max(attempt - 1, 0),
					config.agent.max_retry_backoff_ms,
				);
	return {
		issue_id: issue.id,
		identifier: issue.identifier,
		attempt,
		due_at_ms: nowMs + delay,
		timer_handle: null,
		error,
	};
}

export function normalizeState(value: string): string {
	return value.toLowerCase();
}

export function normalizedSet(values: string[]): Set<string> {
	return new Set(values.map(normalizeState));
}

function compareIssues(left: Issue, right: Issue): number {
	const leftPriority = left.priority ?? Number.POSITIVE_INFINITY;
	const rightPriority = right.priority ?? Number.POSITIVE_INFINITY;
	if (leftPriority !== rightPriority) return leftPriority - rightPriority;
	const leftCreated = left.created_at ?? "";
	const rightCreated = right.created_at ?? "";
	if (leftCreated !== rightCreated)
		return leftCreated.localeCompare(rightCreated);
	return left.identifier.localeCompare(right.identifier);
}
