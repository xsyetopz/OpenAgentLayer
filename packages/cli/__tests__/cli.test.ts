import { expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { providerOption, providerOptions, scopeOption } from "../src/arguments";
import {
	buildPeerSteps,
	codexExecRun,
	codexLaunchRun,
	makeRunId,
	peerRunPaths,
	renderPeerSummary,
} from "../src/commands/codex";
import { opendexRun } from "../src/commands/opendex";
import { runOptionalSetupCommand } from "../src/commands/setup";
import {
	CLAUDE_PLAN_OPTIONS,
	CODEX_ORCHESTRATION_OPTIONS,
	CODEX_PLAN_OPTIONS,
	OPENCODE_PLAN_OPTIONS,
	OPTIONAL_FEATURE_OPTIONS,
	PROFILE_ACTION_OPTIONS,
	setupProfileChoices,
	UNINSTALL_PROVIDER_OPTIONS,
} from "../src/interactive";
import { renderOptions } from "../src/model-options";
import { printDeployReport } from "../src/output";
import { buildSetupArgs } from "../src/workflows";

const repoRoot = resolve(import.meta.dir, "../../..");

test("CLI provider parser accepts OAL providers and rejects unknown providers", () => {
	expect(providerOption("codex")).toBe("codex");
	expect(providerOption("opencode")).toBe("opencode");
	expect(() => providerOption("other")).toThrow("Unsupported provider `other`");
});

test("MCP command serves OAL-owned Anthropic and OpenCode tools", async () => {
	const anthropic = await runDocsMcp("anthropic", [
		{ jsonrpc: "2.0", id: 1, method: "initialize" },
		{ jsonrpc: "2.0", id: 2, method: "tools/list" },
		{
			jsonrpc: "2.0",
			id: 3,
			method: "tools/call",
			params: { name: "search_docs", arguments: { query: "Claude hooks" } },
		},
	]);
	expect(anthropic[0]?.result?.serverInfo?.name).toBe("oal-anthropic-docs");
	expect(anthropic[1]?.result?.tools?.[0]?.name).toBe("search_docs");
	expect(anthropic[2]?.result?.content?.[0]?.text).toContain("anthropic-docs");
	expect(anthropic[2]?.result?.content?.[0]?.text).toContain(
		"https://code.claude.com/docs/en/hooks",
	);

	const opencode = await runDocsMcp("opencode", [
		{ jsonrpc: "2.0", id: 1, method: "initialize" },
		{
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: { name: "list_docs", arguments: {} },
		},
	]);
	expect(opencode[0]?.result?.serverInfo?.name).toBe("oal-opencode-docs");
	expect(opencode[1]?.result?.content?.[0]?.text).toContain("opencode-docs");
	expect(opencode[1]?.result?.content?.[0]?.text).toContain(
		"https://opencode.ai/docs/plugins/",
	);
});

test("MCP command installs OpenCode docs server into config", async () => {
	const home = await mkdtemp(`${tmpdir()}/oal-mcp-home-`);
	const proc = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"mcp",
			"install",
			"opencode-docs",
			"--provider",
			"opencode",
			"--scope",
			"global",
			"--home",
			home,
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	expect(code).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("OpenCode MCP install");
	const config = JSON.parse(
		await readFile(`${home}/.config/opencode/opencode.json`, "utf8"),
	) as {
		mcp?: Record<
			string,
			{ type?: string; command?: string[]; enabled?: boolean }
		>;
	};
	expect(config.mcp?.["oal-opencode-docs"]).toEqual({
		type: "local",
		command: ["oal", "mcp", "serve", "opencode-docs"],
		enabled: true,
	});
});

test("MCP command serves OAL inspect tools", async () => {
	const inspect = await runMcp("oal-inspect", [
		{ jsonrpc: "2.0", id: 1, method: "initialize" },
		{ jsonrpc: "2.0", id: 2, method: "tools/list" },
		{
			jsonrpc: "2.0",
			id: 3,
			method: "tools/call",
			params: { name: "capabilities", arguments: {} },
		},
	]);
	expect(inspect[0]?.result?.serverInfo?.name).toBe("oal-inspect");
	expect(inspect[1]?.result?.tools?.map((tool) => tool.name)).toContain(
		"release_witness",
	);
	expect(inspect[2]?.result?.content?.[0]?.text).toContain(
		"# OAL Capability Report",
	);
	expect(inspect[2]?.result?.content?.[0]?.text).toContain("codex");
});

test("Codex peer runner builds v3-style role steps", () => {
	const runId = makeRunId(new Date("2026-05-06T12:00:00Z"), "seed1234");
	const steps = buildPeerSteps(repoRoot, "/repo", runId);
	expect(steps.map((step) => [step.id, step.mode])).toEqual([
		["orchestrator", "orchestrate"],
		["validate", "validate"],
		["worker", "implement"],
		["review", "review"],
	]);
	expect(steps[0]?.args).toContain("codex");
	expect(steps[0]?.args).toContain("route");
	expect(steps[1]?.args.join("\n")).toContain("Reproduce broadly");
	expect(steps[2]?.args.join("\n")).toContain(
		"Implement the complete cohesive fix",
	);
	for (const step of steps) {
		expect(step.args.join("\n")).toContain(
			"Do not launch `oal codex peer`, `oal codex route orchestrate`, native Codex subagents, or another orchestrator",
		);
	}
});

test("Codex exec runner leaves native multi-agent surfaces available", () => {
	const run = codexExecRun(
		{
			id: "hermes",
			tools: ["read"],
			models: { codex: "gpt-5.4-mini" },
		} as Parameters<typeof codexExecRun>[0],
		"/repo",
		"map files",
	);
	expect(run.args[0]).toBe("exec");
	expect(run.args).not.toContain("--disable");
	expect(run.args).not.toContain("multi_agent_v2");
});

test("Codex launch runner starts interactive native subagent profile", () => {
	const run = codexLaunchRun("/repo", "spawn hermes and wait");
	expect(run.command).toBe("codex");
	expect(run.args).toEqual([
		"--profile",
		"openagentlayer",
		"-C",
		"/repo",
		"spawn hermes and wait",
	]);
});

test("Codex peer summary renders status evidence", () => {
	const summary = renderPeerSummary(
		"fix the auth race",
		"run-123",
		"batch",
		peerRunPaths("/repo", "run-123").root,
		[
			{ id: "orchestrator", status: "ok", exitCode: 0 },
			{ id: "worker", status: "failed", exitCode: 1 },
		],
	);
	expect(summary).toContain("Run ID: `run-123`");
	expect(summary).toContain("`worker`: failed (exit 1)");
	expect(summary).toContain("fix the auth race");
});

test("OpenDex command runs the Rust workspace binary", () => {
	const run = opendexRun(repoRoot, ["--version"]);
	expect(run.cwd).toBe(repoRoot);
	expect(
		run.command.endsWith("target/debug/opendex") ||
			run.args.join(" ").startsWith("run -p opendex --"),
	).toBe(true);
});

async function runDocsMcp(
	kind: "anthropic" | "opencode",
	requests: unknown[],
): Promise<JsonRpcResponse[]> {
	const server = kind === "anthropic" ? "anthropic-docs" : "opencode-docs";
	return await runMcp(server, requests);
}

async function runMcp(
	server: "anthropic-docs" | "opencode-docs" | "oal-inspect",
	requests: unknown[],
): Promise<JsonRpcResponse[]> {
	const proc = Bun.spawn(
		["bun", "packages/cli/src/main.ts", "mcp", "serve", server],
		{ cwd: repoRoot, stdin: "pipe", stdout: "pipe", stderr: "pipe" },
	);
	for (const request of requests)
		proc.stdin.write(`${JSON.stringify(request)}\n`);
	proc.stdin.end();
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0)
		throw new Error(
			`MCP command exited \`${code}\` with stderr:\n\`${stderr}\``,
		);
	if (stderr !== "")
		throw new Error(`MCP command wrote stderr:\n\`${stderr}\``);
	return stdout
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as JsonRpcResponse);
}

interface JsonRpcResponse {
	result?: {
		serverInfo?: { name?: string };
		tools?: { name?: string }[];
		content?: { text?: string }[];
	};
}

test("CLI provider parser accepts comma-separated providers", () => {
	expect(providerOptions("codex,claude")).toEqual(["codex", "claude"]);
	expect(providerOptions("codex,codex")).toEqual(["codex"]);
	expect(providerOptions("all,codex")).toEqual(["all"]);
});

test("CLI scope parser accepts deploy scopes and rejects unknown scopes", () => {
	expect(scopeOption("project")).toBe("project");
	expect(scopeOption("global")).toBe("global");
	expect(() => scopeOption("workspace")).toThrow(
		"Unsupported scope `workspace`",
	);
});

test("deploy report warns that Codex requirements need managed install", () => {
	const lines: string[] = [];
	const originalLog = console.log;
	console.log = (message?: unknown) => {
		lines.push(String(message));
	};
	try {
		printDeployReport(
			{
				sourceRoot: "/repo",
				providers: ["codex"],
				scope: "global",
				targetRoot: "/home/user",
				manifestRoot: "/home/user",
				plan: {
					targetRoot: "/home/user",
					manifestRoot: "/home/user",
					scope: "global",
					artifacts: [
						{
							provider: "codex",
							path: ".codex/requirements.toml",
							content: "",
							sourceId: "requirements:codex",
							mode: "config",
						},
					],
					changes: [],
					manifest: {
						product: "OpenAgentLayer",
						version: 1,
						oalVersion: "0.6.0-beta.3",
						entries: [],
					},
					backups: [],
				},
			},
			{},
		);
	} finally {
		console.log = originalLog;
	}
	expect(lines.join("\n")).toContain(
		"Codex requirements.toml rendered; install it into Codex managed requirements for approval-free hooks",
	);
});

test("interactive setup workflow builds low-level setup args", () => {
	expect(
		buildSetupArgs({
			providers: ["codex", "opencode"],
			scope: "global",
			home: "/home/oal",
			codexPlan: "pro-20",
			opencodePlan: "opencode-free",
			cavemanMode: "full",
			optionalTools: ["ctx7", "deepwiki", "anthropic-docs"],
			context7ApiKey: ["ctx7sk", "abcdefghijklmnop"].join("-"),
			toolchain: true,
			rtk: true,
			dryRun: true,
			verbose: true,
		}),
	).toEqual([
		"--provider",
		"codex,opencode",
		"--scope",
		"global",
		"--home",
		"/home/oal",
		"--codex-plan",
		"pro-20",
		"--opencode-plan",
		"opencode-free",
		"--caveman-mode",
		"full",
		"--rtk",
		"--toolchain",
		"--optional",
		"ctx7,deepwiki,anthropic-docs",
		"--context7-api-key",
		["ctx7sk", "abcdefghijklmnop"].join("-"),
		"--dry-run",
		"--verbose",
	]);
});

test("interactive subscription prompts are ordered from lowest to highest", () => {
	expect(CODEX_PLAN_OPTIONS.map((option) => option.value)).toEqual([
		"plus",
		"pro-5",
		"pro-20",
	]);
	expect(CODEX_ORCHESTRATION_OPTIONS.map((option) => option.value)).toEqual([
		"multi_agent_v2",
		"multi_agent",
		"opendex",
	]);
	expect(CLAUDE_PLAN_OPTIONS.map((option) => option.value)).toEqual([
		"max-5",
		"max-20",
		"max-20-long",
	]);
	expect(OPENCODE_PLAN_OPTIONS.map((option) => option.value)).toEqual([
		"opencode-free",
		"opencode-auto",
		"opencode-auth",
	]);
});

test("Codex orchestration setup args and render options preserve v2 bounds", async () => {
	const args = buildSetupArgs({
		providers: ["codex"],
		scope: "global",
		codexOrchestration: "multi_agent_v2",
		codexAgentMaxDepth: "2",
		codexAgentMaxThreads: "3",
		codexMultiAgentV2MinWaitTimeoutMs: "250",
		codexMultiAgentV2HideSpawnAgentMetadata: "true",
		codexMultiAgentV2UsageHintEnabled: "true",
		codexMultiAgentV2UsageHintText: "Use sparingly.",
	});
	expect(args).toContain("--codex-orchestration");
	expect(args).toContain("multi_agent_v2");
	await expect(renderOptions(args)).resolves.toMatchObject({
		codexOrchestration: {
			mode: "multi_agent_v2",
			maxDepth: 2,
			maxThreads: 3,
			multiAgentV2: {
				minWaitTimeoutMs: 250,
				hideSpawnAgentMetadata: true,
				usageHintEnabled: true,
				usageHintText: "Use sparingly.",
			},
		},
	});
});

test("interactive setup asks to use active and saved profiles", () => {
	expect(
		setupProfileChoices({
			activeProfile: "daily",
			profiles: {
				daily: { providers: ["codex"], scope: "global", home: "/tmp/home" },
				project: {
					providers: ["claude", "opencode"],
					scope: "project",
					target: "/tmp/repo",
				},
			},
		}).map((choice) => choice.value),
	).toEqual(["manual", "profile:daily", "profile:project"]);
});

test("interactive profile menu exposes removal", () => {
	expect(PROFILE_ACTION_OPTIONS.map((option) => option.value)).toEqual([
		"list",
		"show",
		"use",
		"remove",
	]);
});

test("interactive cleanup menus expose multi-selectable choices", () => {
	expect(UNINSTALL_PROVIDER_OPTIONS.map((option) => option.value)).toEqual([
		"codex",
		"claude",
		"opencode",
	]);
	expect(OPTIONAL_FEATURE_OPTIONS.map((option) => option.value)).toEqual([
		"ctx7",
		"playwright",
		"deepwiki",
		"anthropic-docs",
		"opencode-docs",
	]);
});

test("setup optional commands stream readable progress and time out", async () => {
	const originalForceColor = process.env["FORCE_COLOR"];
	process.env["FORCE_COLOR"] = "1";
	const logs: string[] = [];
	const writes: string[] = [];
	const originalLog = console.log;
	const originalWrite = process.stdout.write;
	console.log = (message?: unknown) => {
		logs.push(String(message ?? ""));
	};
	process.stdout.write = ((chunk: string | Uint8Array) => {
		writes.push(String(chunk));
		return true;
	}) as typeof process.stdout.write;
	try {
		await expect(
			runOptionalSetupCommand("true", {
				quiet: false,
				index: 1,
				total: 1,
				timeoutMs: 1000,
				idleTimeoutMs: 1000,
			}),
		).resolves.toMatchObject({ ok: true, timedOut: false });
	} finally {
		console.log = originalLog;
		process.stdout.write = originalWrite;
		if (originalForceColor === undefined) delete process.env["FORCE_COLOR"];
		else process.env["FORCE_COLOR"] = originalForceColor;
	}
	expect(logs.join("\n")).toContain("\u001b[36m◇ Optional setup 1/1");
	expect(logs.join("\n")).toContain("\u001b[32m└ ✓ optional setup completed");
	expect(writes.join("")).toContain("running optional setup 1/1");

	await expect(
		runOptionalSetupCommand('node -e "setTimeout(() => {}, 1000)"', {
			quiet: true,
			index: 1,
			total: 1,
			timeoutMs: 20,
			idleTimeoutMs: 1000,
		}),
	).resolves.toMatchObject({ ok: false, timedOut: true });
	await expect(
		runOptionalSetupCommand('node -e "setTimeout(() => {}, 1000)"', {
			quiet: true,
			index: 1,
			total: 1,
			timeoutMs: 1000,
			idleTimeoutMs: 20,
		}),
	).resolves.toMatchObject({
		ok: false,
		timedOut: true,
		timedOutReason: "no output for 1s",
	});
});

test("state inspect explicit setup args override active profile", async () => {
	const root = await mkdtemp(`${tmpdir()}/oal-state-`);
	const config = `${root}/config.json`;
	const target = `${root}/target`;
	await writeFile(
		config,
		JSON.stringify({
			version: 1,
			activeProfile: "daily",
			profiles: {
				daily: {
					providers: ["opencode"],
					scope: "global",
					optionalTools: ["deepwiki", "ctx7"],
				},
			},
		}),
	);
	const proc = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"state",
			"inspect",
			"--config",
			config,
			"--provider",
			"codex",
			"--scope",
			"project",
			"--target",
			target,
			"--optional",
			"ctx7",
			"--json",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	expect(stderr).toBe("");
	expect(code).toBe(0);
	const report = JSON.parse(stdout);
	expect(report.profile).toBeUndefined();
	expect(report.requested).toEqual(["codex"]);
	expect(report.optionalFeatures.selected).toEqual(["ctx7"]);
});
