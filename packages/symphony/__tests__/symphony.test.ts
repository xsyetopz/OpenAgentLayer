import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	CodexCommandRunner,
	claimIssue,
	codexLaunchCommand,
	createOrchestratorState,
	eligibleIssues,
	ensureWorkspace,
	type Issue,
	LinearTrackerClient,
	OpenDexControlPlane,
	parseWorkflow,
	renderPrompt,
	resolveConfig,
	SymphonyService,
	type SymphonyTrackerClient,
	scheduleRetry,
	symphonyCliMain,
} from "../src";

const baseIssue: Issue = {
	id: "1",
	identifier: "ABC-1",
	title: "Fix it",
	description: null,
	priority: 2,
	state: "Todo",
	branch_name: null,
	url: null,
	labels: ["bug"],
	blocked_by: [],
	created_at: "2026-05-01T00:00:00Z",
	updated_at: null,
};

test("workflow loader parses front matter and resolves typed defaults", () => {
	const workflow = parseWorkflow(`---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: OAL
workspace:
  root: ./work
agent:
  max_concurrent_agents: 2
  max_concurrent_agents_by_state:
    Todo: 1
codex:
  command: codex app-server --profile openagentlayer
---
Work on {{ issue.identifier }}: {{ issue.title }}
`);
	const config = resolveConfig(
		{ ...workflow, path: "/repo/WORKFLOW.md" },
		{ LINEAR_API_KEY: "lin_api" },
	);
	expect(config.tracker.endpoint).toBe("https://api.linear.app/graphql");
	expect(config.workspace.root).toBe("/repo/work");
	expect(config.agent.max_concurrent_agents).toBe(2);
	expect(config.agent.max_concurrent_agents_by_state["todo"]).toBe(1);
	expect(config.codex.command).toBe(
		"codex app-server --profile openagentlayer",
	);
	expect(renderPrompt(workflow.prompt_template, baseIssue, null)).toContain(
		"ABC-1",
	);
});

test("scheduler filters claimed, blocked, inactive, and over-limit issues", () => {
	const workflow = parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
agent:
  max_concurrent_agents: 2
  max_concurrent_agents_by_state:
    Todo: 1
---`);
	const config = resolveConfig(workflow, {});
	const state = createOrchestratorState(config);
	const running = { ...baseIssue, id: "running", identifier: "ABC-0" };
	state.running.set(running.id, {
		issue: running,
		started_at: 0,
		last_codex_timestamp: null,
	});
	claimIssue(state, { ...baseIssue, id: "claimed", identifier: "ABC-9" });
	const blocked = {
		...baseIssue,
		id: "blocked",
		identifier: "ABC-2",
		blocked_by: [
			{
				id: "b",
				identifier: "ABC-0",
				state: "Todo",
				created_at: null,
				updated_at: null,
			},
		],
	};
	const candidates = eligibleIssues(
		[
			blocked,
			{ ...baseIssue, id: "done", identifier: "ABC-3", state: "Done" },
			{
				...baseIssue,
				id: "next",
				identifier: "ABC-4",
				state: "In Progress",
				priority: 1,
			},
			{ ...baseIssue, id: "claimed", identifier: "ABC-9" },
		],
		config,
		state,
	);
	expect(candidates.map((issue) => issue.identifier)).toEqual(["ABC-4"]);
});

test("workspace manager sanitizes keys and runs create hook once", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-"));
	try {
		const config = resolveConfig(
			parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
workspace:
  root: ${root}
hooks:
  after_create: echo created
---`),
			{},
		);
		const calls: string[] = [];
		const issue = { ...baseIssue, identifier: "ABC/123" };
		const first = await ensureWorkspace(config, issue, (script, cwd) => {
			calls.push(`${script}:${cwd}`);
			return Promise.resolve();
		});
		const second = await ensureWorkspace(config, issue, (script, cwd) => {
			calls.push(`${script}:${cwd}`);
			return Promise.resolve();
		});
		expect(first.workspace_key).toBe("ABC_123");
		expect(first.created_now).toBe(true);
		expect(second.created_now).toBe(false);
		expect(calls).toHaveLength(1);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("workspace manager rejects existing non-directory workspaces", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-"));
	try {
		await writeFile(join(root, "ABC-1"), "not a directory");
		const config = resolveConfig(
			parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
workspace:
  root: ${root}
---`),
			{},
		);
		await expect(ensureWorkspace(config, baseIssue)).rejects.toThrow(
			"not a directory",
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("retry and codex command contracts match Symphony spec defaults", () => {
	const config = resolveConfig(
		parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
---`),
		{},
	);
	expect(scheduleRetry(config, baseIssue, 1, 1000, null).due_at_ms).toBe(2000);
	expect(scheduleRetry(config, baseIssue, 2, 1000, "failed").due_at_ms).toBe(
		21000,
	);
	expect(codexLaunchCommand(config)).toEqual({
		command: "bash",
		args: ["-lc", "codex app-server"],
	});
});

test("codex runner speaks app-server JSONL initialize thread and turn protocol", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-runner-"));
	const originalFetch = globalThis.fetch;
	try {
		const logPath = join(root, "protocol.log");
		const serverPath = join(root, "fake-app-server.mjs");
		await writeFile(
			serverPath,
			`import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
const logPath = ${JSON.stringify(logPath)};
const lines = createInterface({ input: process.stdin });
function send(message) {
  process.stdout.write(JSON.stringify(message) + "\\n");
}
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method) appendFileSync(logPath, message.method + "\\n");
  if (message.method === "initialize") {
    send({ id: message.id, method: "initialize", response: {} });
  } else if (message.method === "thread/start") {
    appendFileSync(logPath, "dynamicTools:" + message.params.dynamicTools.map((tool) => tool.name).join(",") + "\\n");
    send({ id: message.id, method: "thread/start", response: { thread: { id: "thread-1" } } });
  } else if (message.method === "turn/start") {
    send({ id: message.id, method: "turn/start", response: { turn: { id: "turn-1" } } });
    send({ id: 99, method: "item/tool/call", params: { threadId: "thread-1", turnId: "turn-1", callId: "call-1", tool: "linear_graphql", arguments: { query: "query Test { viewer { id } }", variables: { id: "viewer" } } } });
  } else if (message.id === 99) {
    appendFileSync(logPath, "toolSuccess:" + message.result.success + "\\n");
    appendFileSync(logPath, "toolText:" + message.result.contentItems[0].text + "\\n");
    send({ method: "turn/completed", params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed" }, usage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 } } });
  }
});
`,
		);
		globalThis.fetch = ((url: string, init: RequestInit) => {
			expect(url).toBe("https://api.linear.app/graphql");
			expect(JSON.parse(String(init.body))).toEqual({
				query: "query Test { viewer { id } }",
				variables: { id: "viewer" },
			});
			return Promise.resolve({
				ok: true,
				text: () => Promise.resolve('{"data":{"viewer":{"id":"viewer"}}}'),
			} as Response);
		}) as typeof fetch;
		const config = resolveConfig(
			parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
workspace:
  root: ${root}
codex:
  command: bun ${serverPath}
---`),
			{},
		);
		const workspace = await ensureWorkspace(config, baseIssue);
		const result = await new CodexCommandRunner().run({
			issue: baseIssue,
			attempt: null,
			turn: 1,
			workspace,
			workflow: {
				config: {},
				prompt_template: "",
				path: join(root, "WORKFLOW.md"),
			},
			config,
			prompt: "Handle ABC-1",
		});
		expect(result).toMatchObject({
			status: "succeeded",
			input_tokens: 3,
			output_tokens: 4,
			total_tokens: 7,
			session_id: "thread-1-turn-1",
			thread_id: "thread-1",
			turn_id: "turn-1",
		});
		expect(await readFile(logPath, "utf8")).toBe(
			'initialize\ninitialized\nthread/start\ndynamicTools:linear_graphql\nturn/start\ntoolSuccess:true\ntoolText:{"data":{"viewer":{"id":"viewer"}}}\n',
		);
	} finally {
		globalThis.fetch = originalFetch;
		await rm(root, { recursive: true, force: true });
	}
});

test("service reloads workflow, dispatches workers, records totals, and queues continuation", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-service-"));
	try {
		const workflowPath = join(root, "WORKFLOW.md");
		await writeFile(
			workflowPath,
			`---
tracker:
  kind: linear
  api_key: local
  project_slug: OAL
workspace:
  root: ${root}
agent:
  max_concurrent_agents: 1
  max_turns: 1
---
Handle {{ issue.identifier }}
`,
		);
		const issue = { ...baseIssue, state: "In Progress" };
		const tracker: SymphonyTrackerClient = {
			fetchCandidateIssues() {
				return Promise.resolve([issue]);
			},
			fetchIssueStates() {
				return Promise.resolve([{ ...issue, state: "Done" }]);
			},
			fetchTerminalIssues() {
				return Promise.resolve([]);
			},
		};
		const prompts: string[] = [];
		const service = new SymphonyService({
			workflowPath,
			tracker,
			runner: {
				run(input) {
					prompts.push(input.prompt);
					return Promise.resolve({
						status: "succeeded",
						input_tokens: 10,
						output_tokens: 2,
						total_tokens: 12,
					});
				},
			},
		});
		await service.tick();
		await service.drain();
		expect(prompts).toEqual(["Handle ABC-1"]);
		expect(service.state.codex_totals.total_tokens).toBe(12);
		expect(service.state.completed.has(issue.id)).toBe(true);
		expect(service.state.retry_attempts.get(issue.id)?.error).toBeNull();
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("service redispatches continuation retries for retry-claimed issues", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-service-"));
	try {
		const workflowPath = join(root, "WORKFLOW.md");
		await writeFile(
			workflowPath,
			`---
tracker:
  kind: linear
  api_key: local
  project_slug: OAL
workspace:
  root: ${root}
agent:
  max_concurrent_agents: 1
  max_turns: 1
---
Handle {{ issue.identifier }}
`,
		);
		let now = 0;
		const issue = { ...baseIssue, state: "In Progress" };
		const tracker: SymphonyTrackerClient = {
			fetchCandidateIssues() {
				return Promise.resolve([issue]);
			},
			fetchIssueStates() {
				return Promise.resolve([issue]);
			},
			fetchTerminalIssues() {
				return Promise.resolve([]);
			},
		};
		let runs = 0;
		const service = new SymphonyService({
			workflowPath,
			tracker,
			nowMs: () => now,
			runner: {
				run() {
					runs += 1;
					return Promise.resolve({ status: "succeeded" });
				},
			},
		});
		await service.tick();
		await service.drain();
		now = 1001;
		await service.tick();
		await service.drain();
		expect(runs).toBe(2);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("best-effort hooks do not block after-run or cleanup", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-service-"));
	try {
		const workflowPath = join(root, "WORKFLOW.md");
		await writeFile(
			workflowPath,
			`---
tracker:
  kind: linear
  api_key: local
  project_slug: OAL
workspace:
  root: ${root}
hooks:
  after_run: fail after
  before_remove: fail remove
agent:
  max_turns: 1
---
`,
		);
		const issue = { ...baseIssue, state: "In Progress" };
		const terminal = { ...issue, state: "Done" };
		const logs: string[] = [];
		const service = new SymphonyService({
			workflowPath,
			tracker: {
				fetchCandidateIssues() {
					return Promise.resolve([issue]);
				},
				fetchIssueStates() {
					return Promise.resolve([terminal]);
				},
				fetchTerminalIssues() {
					return Promise.resolve([terminal]);
				},
			},
			hookRunner(script) {
				return script.startsWith("fail")
					? Promise.reject(new Error(script))
					: Promise.resolve();
			},
			logger(entry) {
				logs.push(entry.event);
			},
			runner: {
				run() {
					return Promise.resolve({ status: "succeeded" });
				},
			},
		});
		await service.tick();
		await service.drain();
		await service.cleanupTerminalWorkspaces();
		expect(logs).toContain("after_run_hook_failed");
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("linear client uses slugId, ID refresh typing, active states, and pagination", async () => {
	const config = resolveConfig(
		parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
---`),
		{},
	);
	const calls: Record<string, unknown>[] = [];
	const client = new LinearTrackerClient(((url: string, init: RequestInit) => {
		expect(url).toBe("https://api.linear.app/graphql");
		const body = JSON.parse(String(init.body)) as Record<string, unknown>;
		calls.push(body);
		return Promise.resolve({
			ok: true,
			json: () =>
				Promise.resolve({
					data: {
						issues: {
							pageInfo: {
								hasNextPage: calls.length === 1,
								endCursor: calls.length === 1 ? "cursor-1" : null,
							},
							nodes: [
								{
									id: `id-${calls.length}`,
									identifier: `ABC-${calls.length}`,
									title: "Fix",
									description: null,
									priority: null,
									url: null,
									branchName: null,
									createdAt: null,
									updatedAt: null,
									state: { name: "Todo" },
									labels: { nodes: [{ name: "Bug" }] },
									inverseRelations: { nodes: [] },
								},
							],
						},
					},
				}),
		} as Response);
	}) as typeof fetch);
	const issues = await client.fetchCandidateIssues(config);
	await client.fetchIssueStates(["id-1"], config);
	expect(issues.map((issue) => issue.identifier)).toEqual(["ABC-1", "ABC-2"]);
	expect(calls[0]["query"]).toContain("slugId");
	expect(calls[0]["variables"]).toMatchObject({
		states: ["Todo", "In Progress"],
	});
	expect(calls[1]["variables"]).toMatchObject({ after: "cursor-1" });
	expect(calls[2]["query"]).toContain("$issueIds: [ID!]");
	expect(calls[2]["variables"]).toMatchObject({ issueIds: ["id-1"] });
});

test("cli exits nonzero for missing explicit workflow path", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-cli-"));
	const originalError = console.error;
	console.error = () => {
		// Expected missing-workflow diagnostic is asserted by exit code here.
	};
	try {
		const exitCode = await symphonyCliMain([
			"bun",
			"symphony",
			join(root, "missing-WORKFLOW.md"),
		]);
		expect(exitCode).toBe(1);
	} finally {
		console.error = originalError;
		await rm(root, { recursive: true, force: true });
	}
});

test("OpenDex lets only the project orchestrator spawn worker and qa sessions", () => {
	const opendex = new OpenDexControlPlane({ nowMs: () => 100 });
	const project = opendex.registerProject({
		id: "project-oal",
		name: "OpenAgentLayer",
		root: "/repo",
		orchestratorThreadId: "thread-parent",
	});
	expect(project.orchestrator_thread_id).toBe("thread-parent");
	expect(() =>
		opendex.spawnAgent("project-oal", "thread-worker", {
			role: "worker",
			task: "change source",
		}),
	).toThrow("orchestrator mismatch");
	const worker = opendex.spawnAgent("project-oal", "thread-parent", {
		role: "worker",
		task: "implement OpenDex",
		threadId: "thread-worker",
		ownedPaths: ["packages/symphony"],
		expectedEvidence: ["bun test packages/symphony/__tests__/symphony.test.ts"],
	});
	const qa = opendex.spawnAgent("project-oal", "thread-parent", {
		role: "qa",
		task: "review OpenDex",
		threadId: "thread-qa",
	});
	expect(worker).toMatchObject({
		project_id: "project-oal",
		role: "worker",
		thread_id: "thread-worker",
		parent_thread_id: "thread-parent",
		status: "running",
	});
	expect(qa.role).toBe("qa");
});

test("OpenDex routes final worker messages and artifacts to the orchestrator inbox", () => {
	const opendex = new OpenDexControlPlane({ nowMs: () => 200 });
	opendex.registerProject({
		id: "project-oal",
		name: "OpenAgentLayer",
		root: "/repo",
		orchestratorThreadId: "thread-parent",
	});
	opendex.spawnAgent("project-oal", "thread-parent", {
		role: "worker",
		task: "produce visual proof",
		threadId: "thread-worker",
	});
	const screenshot = opendex.recordArtifact("thread-worker", {
		kind: "screenshot",
		path: ".openagentlayer/opendex/run-1/screenshot.png",
		title: "Rendered state",
	});
	const handoff = opendex.recordArtifact("thread-worker", {
		kind: "handoff",
		path: ".openagentlayer/opendex/run-1/handoff.md",
	});
	const message = opendex.recordMessage("thread-worker", {
		text: "Implemented and attached evidence.",
		final: true,
		artifactIds: [screenshot.id, handoff.id],
	});
	const project = opendex.project("project-oal");
	expect(message.final).toBe(true);
	expect(project.agents[0]).toMatchObject({ status: "waiting" });
	expect(project.inbox).toEqual([
		expect.objectContaining({
			orchestrator_thread_id: "thread-parent",
			worker_thread_id: "thread-worker",
			message_id: message.id,
			artifact_ids: [screenshot.id, handoff.id],
		}),
	]);
	expect(project.events.map((event) => event.kind)).toContain("worker_routed");
});

test("OpenDex keeps continuation and approval authority in the parent thread", () => {
	const opendex = new OpenDexControlPlane({ nowMs: () => 300 });
	opendex.registerProject({
		id: "project-oal",
		name: "OpenAgentLayer",
		root: "/repo",
		orchestratorThreadId: "thread-parent",
	});
	opendex.spawnAgent("project-oal", "thread-parent", {
		role: "worker",
		task: "finish product slice",
		threadId: "thread-worker",
	});
	opendex.recordMessage("thread-worker", {
		text: "Need another pass.",
		final: true,
	});
	expect(() =>
		opendex.decideContinuation("thread-worker", "thread-worker", {
			kind: "approved",
		}),
	).toThrow("orchestrator mismatch");
	expect(
		opendex.decideContinuation("thread-parent", "thread-worker", {
			kind: "continue",
			note: "Add tests.",
		}).status,
	).toBe("running");
	expect(
		opendex.decideContinuation("thread-parent", "thread-worker", {
			kind: "approved",
			note: "Evidence accepted.",
		}).status,
	).toBe("approved");
	expect(opendex.archiveAgent("thread-parent", "thread-worker").status).toBe(
		"archived",
	);
});
