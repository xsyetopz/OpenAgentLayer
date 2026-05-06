import { expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { providerOption, providerOptions, scopeOption } from "../src/arguments";
import {
	buildPeerSteps,
	codexLaunchRun,
	makeRunId,
	peerRunPaths,
	renderPeerSummary,
} from "../src/commands/codex";
import {
	CLAUDE_PLAN_OPTIONS,
	CODEX_PLAN_OPTIONS,
	OPENCODE_PLAN_OPTIONS,
	setupProfileChoices,
} from "../src/interactive";
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
		"Implement the smallest cohesive fix",
	);
});

test("Codex launch runner starts interactive native subagent profile", () => {
	const run = codexLaunchRun("/repo", "spawn hermes and wait");
	expect(run.command).toBe("codex");
	expect(run.args).toEqual([
		"--profile",
		"openagentlayer",
		"--enable",
		"multi_agent_v2",
		"--enable",
		"enable_fanout",
		"--disable",
		"multi_agent",
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
