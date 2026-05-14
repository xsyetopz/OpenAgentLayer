import { expect, test } from "bun:test";
import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { OAL_CLI_ENTRY_RELATIVE } from "@openagentlayer/source";
import {
	OFFICIAL_SKILLS_BASE_URL,
	OFFICIAL_SKILLS_HOSTNAME,
} from "@openagentlayer/toolchain";
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
import {
	runOptionalSetupCommand,
	runSetupCommand,
} from "../src/commands/setup";
import { runFeaturesCommand } from "../src/commands/toolchain";
import {
	CLAUDE_PLAN_OPTIONS,
	CODEX_ORCHESTRATION_OPTIONS,
	CODEX_PLAN_OPTIONS,
	fetchOfficialSkillCatalogWithTimeout,
	OPENCODE_PLAN_OPTIONS,
	OPTIONAL_FEATURE_OPTIONS,
	officialSkillActionCommands,
	officialSkillOptions,
	PROFILE_ACTION_OPTIONS,
	readOfficialSkillsCache,
	sameOfficialSkillsCatalog,
	setupProfileChoices,
	UNINSTALL_PROVIDER_OPTIONS,
	writeOfficialSkillsCache,
} from "../src/interactive";
import {
	searchWorkflowOptions,
	WORKFLOW_CATEGORY_CONTROL_OPTIONS,
	WORKFLOW_CATEGORY_OPTIONS,
	WORKFLOW_OPTIONS,
	WORKFLOW_OPTIONS_BY_CATEGORY,
} from "../src/interactive-menu";
import { renderOptions } from "../src/model-options";
import { printDeployReport } from "../src/output";
import { buildSetupArgs } from "../src/workflows";

const repoRoot = resolve(import.meta.dir, "../../..");
const OFFICIAL_SKILLS_CATALOG_URL = `${OFFICIAL_SKILLS_BASE_URL}/`;

function officialSkillSourceUrl(owner: string, skill: string): string {
	return `${OFFICIAL_SKILLS_BASE_URL}/${owner}/skills/${skill}`;
}

async function fakeProviderPath(
	root: string,
	providers: string[],
): Promise<NodeJS.ProcessEnv> {
	const bin = join(root, "provider-bin");
	await mkdir(bin, { recursive: true });
	for (const provider of providers) {
		const path = join(bin, provider);
		await writeFile(path, "#!/usr/bin/env sh\nexit 0\n");
		await chmod(path, 0o755);
	}
	return { ...process.env, PATH: `${bin}:${process.env["PATH"] ?? ""}` };
}

test("CLI provider parser accepts OAL providers and rejects unknown providers", () => {
	expect(providerOption("codex")).toBe("codex");
	expect(providerOption("opencode")).toBe("opencode");
	expect(() => providerOption("other")).toThrow("Unsupported provider `other`");
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

async function runMcp(
	server: "oal-inspect",
	requests: unknown[],
): Promise<JsonRpcResponse[]> {
	const proc = Bun.spawn(
		["bun", OAL_CLI_ENTRY_RELATIVE, "mcp", "serve", server],
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
			optionalTools: [
				"ctx7",
				"deepwiki",
				"skill-openai-gh-fix-ci",
				"skill-trailofbits-static-analysis",
			],
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
		"ctx7,deepwiki,skill-openai-gh-fix-ci,skill-trailofbits-static-analysis",
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

test("Codex profile model setup args and render options are explicit", async () => {
	const args = buildSetupArgs({
		providers: ["codex"],
		scope: "global",
		codexPlan: "pro-5",
		codexProfileModel: "gpt-5.4",
	});
	expect(args).toContain("--codex-profile-model");
	expect(args).toContain("gpt-5.4");
	await expect(renderOptions(args)).resolves.toMatchObject({
		codexPlan: "pro-5",
		codexProfileModel: "gpt-5.4",
	});
	await expect(
		renderOptions([
			"--provider",
			"codex",
			"--codex-profile-model",
			"gpt-5.3-codex",
		]),
	).rejects.toThrow("Unsupported Codex profile model");
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
		"edit",
		"rename",
		"remove",
	]);
});

test("interactive command hub uses a tree menu", () => {
	expect(WORKFLOW_CATEGORY_OPTIONS.map((option) => option.value)).toEqual([
		"start",
		"inspect",
		"artifacts",
		"extend",
		"manage",
	]);
	expect(
		WORKFLOW_CATEGORY_CONTROL_OPTIONS.map((option) => option.value),
	).toEqual(["search", "quit"]);
	expect(
		Object.fromEntries(
			Object.entries(WORKFLOW_OPTIONS_BY_CATEGORY).map(
				([category, options]) => [
					category,
					options.map((option) => option.value),
				],
			),
		),
	).toEqual({
		start: ["setup", "repair"],
		inspect: ["status", "validate"],
		artifacts: ["artifacts", "deploy"],
		extend: ["skills", "plugins"],
		manage: ["profiles", "uninstall"],
	});
	expect(WORKFLOW_OPTIONS.map((option) => option.value)).toEqual([
		"setup",
		"repair",
		"status",
		"validate",
		"artifacts",
		"deploy",
		"skills",
		"plugins",
		"profiles",
		"uninstall",
	]);
	expect(WORKFLOW_OPTIONS.map((option) => option.label).join("\n")).toContain(
		"Official skills",
	);
	expect(WORKFLOW_OPTIONS.map((option) => option.label).join("\n")).toContain(
		"Deploy provider files",
	);
	expect(new Set(WORKFLOW_OPTIONS.map((option) => option.label)).size).toBe(
		WORKFLOW_OPTIONS.length,
	);
	expect(
		WORKFLOW_OPTIONS.filter((option) => option.label.includes(" · ")),
	).toEqual([]);
	expect(WORKFLOW_OPTIONS.map((option) => option.hint).join("\n")).toContain(
		`install from ${OFFICIAL_SKILLS_HOSTNAME} tabs`,
	);
	expect(searchWorkflowOptions("deploy").map((option) => option.value)).toEqual(
		["deploy"],
	);
	expect(
		searchWorkflowOptions("officialskills").map((option) => option.value),
	).toEqual(["skills"]);
});

test("profiles command renames saved profiles and preserves active profile", async () => {
	const root = await mkdtemp(`${tmpdir()}/oal-profiles-`);
	const config = `${root}/config.json`;
	await writeFile(
		config,
		JSON.stringify({
			version: 1,
			activeProfile: "daily",
			profiles: {
				daily: {
					providers: ["codex"],
					scope: "global",
					optionalTools: ["ctx7"],
				},
			},
		}),
	);
	const proc = Bun.spawn(
		[
			"bun",
			OAL_CLI_ENTRY_RELATIVE,
			"profiles",
			"rename",
			"daily",
			"work",
			"--config",
			config,
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
	expect(stdout).toContain("Renamed profile `daily` to `work`");
	const saved = JSON.parse(await readFile(config, "utf8"));
	expect(saved.activeProfile).toBe("work");
	expect(saved.profiles.daily).toBeUndefined();
	expect(saved.profiles.work.optionalTools).toEqual(["ctx7"]);
});

test("profiles command edits existing profiles", async () => {
	const root = await mkdtemp(`${tmpdir()}/oal-profiles-edit-`);
	const config = `${root}/config.json`;
	await writeFile(
		config,
		JSON.stringify({
			version: 1,
			profiles: {
				daily: {
					providers: ["codex"],
					scope: "global",
					optionalTools: ["ctx7"],
				},
			},
		}),
	);
	const proc = Bun.spawn(
		[
			"bun",
			OAL_CLI_ENTRY_RELATIVE,
			"profiles",
			"edit",
			"daily",
			"--provider",
			"opencode",
			"--scope",
			"project",
			"--target",
			"/tmp/project",
			"--optional",
			"skill-openai-gh-fix-ci",
			"--config",
			config,
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
	expect(stdout).toContain("Edited profile `daily`");
	const saved = JSON.parse(await readFile(config, "utf8"));
	expect(saved.profiles.daily).toMatchObject({
		providers: ["opencode"],
		scope: "project",
		target: "/tmp/project",
		optionalTools: ["skill-openai-gh-fix-ci"],
	});
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
		"skill-openai-gh-fix-ci",
		"skill-openai-gh-address-comments",
		"skill-openai-yeet",
		"skill-openai-playwright",
		"skill-trailofbits-audit-context-building",
		"skill-trailofbits-differential-review",
		"skill-trailofbits-static-analysis",
		"skill-trailofbits-testing-handbook-skills",
		"skill-getsentry-sentry-workflow",
		"skill-anthropics-mcp-builder",
	]);
});

test("setup defaults include curated official skills", async () => {
	const root = await mkdtemp(`${tmpdir()}/oal-setup-default-skills-`);
	const env = await fakeProviderPath(root, ["codex"]);
	const proc = Bun.spawn(
		[
			"bun",
			OAL_CLI_ENTRY_RELATIVE,
			"setup",
			"--scope",
			"global",
			"--home",
			root,
			"--provider",
			"codex",
			"--dry-run",
			"--quiet",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	await rm(root, { recursive: true, force: true });
	expect(stderr).toBe("");
	expect(code).toBe(0);
	expect(stdout).toContain("selected: skill-openai-gh-fix-ci");
	expect(stdout).toContain("skill-anthropics-mcp-builder");
	expect(stdout).toContain(
		"bunx skills add https://github.com/openai/skills --skill gh-fix-ci --yes --global",
	);
	expect(stdout).toContain(
		"bunx skills add https://github.com/anthropics/skills --skill mcp-builder --yes --global",
	);
});

test("setup installs default official skills into selected Codex home", async () => {
	const root = await mkdtemp(`${tmpdir()}/oal-setup-home-skills-`);
	const bin = join(root, "provider-bin");
	const logPath = join(root, "codex-home.log");
	await mkdir(bin, { recursive: true });
	await writeFile(join(bin, "codex"), "#!/usr/bin/env sh\nexit 0\n");
	await writeFile(
		join(bin, "bunx"),
		`#!/usr/bin/env sh
if [ -z "$CODEX_HOME" ]; then
  echo "missing CODEX_HOME" >&2
  exit 2
fi
printf '%s\\n' "$CODEX_HOME" >> "$OAL_CODEX_HOME_LOG"
if [ "$1" = "skills" ] && [ "$2" = "add" ]; then
  case "$3" in
    */plugins/static-analysis)
      mkdir -p "$CODEX_HOME/skills/static-analysis"
      printf 'name: static-analysis\\n' > "$CODEX_HOME/skills/static-analysis/SKILL.md"
      ;;
  esac
  in_skills=0
  while [ "$#" -gt 0 ]; do
    if [ "$1" = "--skill" ]; then
      in_skills=1
      shift
      continue
    fi
    if [ "$in_skills" = "1" ]; then
      case "$1" in
        --*) break ;;
        *)
          mkdir -p "$CODEX_HOME/skills/$1"
          printf 'name: %s\\n' "$1" > "$CODEX_HOME/skills/$1/SKILL.md"
          ;;
      esac
    fi
    shift
  done
fi
exit 0
`,
	);
	await chmod(join(bin, "codex"), 0o755);
	await chmod(join(bin, "bunx"), 0o755);
	const originalPath = process.env["PATH"];
	const originalLog = process.env["OAL_CODEX_HOME_LOG"];
	process.env["PATH"] = `${bin}:${originalPath ?? ""}`;
	process.env["OAL_CODEX_HOME_LOG"] = logPath;
	try {
		await runSetupCommand(repoRoot, [
			"setup",
			"--scope",
			"global",
			"--home",
			root,
			"--provider",
			"codex",
			"--quiet",
		]);
		await runSetupCommand(repoRoot, [
			"setup",
			"--scope",
			"global",
			"--home",
			root,
			"--provider",
			"codex",
			"--quiet",
		]);
	} finally {
		if (originalPath === undefined) delete process.env["PATH"];
		else process.env["PATH"] = originalPath;
		if (originalLog === undefined) delete process.env["OAL_CODEX_HOME_LOG"];
		else process.env["OAL_CODEX_HOME_LOG"] = originalLog;
	}
	const codexHome = join(root, ".codex");
	const installs = (await readFile(logPath, "utf8")).trim().split("\n");
	expect(new Set(installs)).toEqual(new Set([codexHome]));
	expect(installs).toHaveLength(10);
	expect(
		await readFile(join(codexHome, "skills", "gh-fix-ci", "SKILL.md"), "utf8"),
	).toContain("gh-fix-ci");
	await rm(root, { recursive: true, force: true });
});

test("official skill prompt choices use unique values", () => {
	const options = officialSkillOptions([
		{
			id: "skill-acme-bug-debug",
			publisher: "Acme",
			name: "bug-debug",
			category: "development",
			sourceStatus: "community",
			repo: "https://github.com/acme/skills",
			skill: "bug-debug",
			sourceUrl: officialSkillSourceUrl("acme", "bug-debug"),
			description: "Debug bugs.",
		},
		{
			id: "skill-example-bug-debug",
			publisher: "Example",
			name: "bug-debug",
			category: "development",
			sourceStatus: "community",
			repo: "https://github.com/example/skills",
			skill: "bug-debug",
			sourceUrl: officialSkillSourceUrl("example", "bug-debug"),
			description: "Debug bugs.",
		},
		{
			id: "skill-example-bug-debug",
			publisher: "Example",
			name: "bug-debug",
			category: "development",
			sourceStatus: "community",
			repo: "https://github.com/example/skills",
			skill: "bug-debug",
			sourceUrl: officialSkillSourceUrl("example", "bug-debug"),
			description: "Debug bugs.",
		},
	]);
	expect(options.map((option) => String(option.value))).toEqual([
		"skill-acme-bug-debug",
		"skill-example-bug-debug",
	]);
	expect(new Set(options.map((option) => option.value)).size).toBe(
		options.length,
	);
});

test("official skill interactive actions build executable commands", () => {
	const catalog = [
		{
			id: "skill-acme-bug-debug",
			publisher: "Acme",
			name: "bug-debug",
			category: "development",
			sourceStatus: "community",
			repo: "https://github.com/acme/skills",
			skill: "bug-debug",
			sourceUrl: officialSkillSourceUrl("acme", "bug-debug"),
			description: "Debug bugs.",
		},
	] as const;
	expect(
		officialSkillActionCommands("install", ["skill-acme-bug-debug"], catalog),
	).toEqual([
		"bunx skills add https://github.com/acme/skills --skill bug-debug --yes --global",
	]);
	expect(
		officialSkillActionCommands("remove", ["skill-acme-bug-debug"], catalog),
	).toEqual(["bunx skills remove bug-debug --yes --global"]);
});

test("official skill catalog loading can take its time by default", async () => {
	const originalFetch = globalThis.fetch;
	let receivedSignal = false;
	globalThis.fetch = ((_url: string, init?: RequestInit) => {
		receivedSignal = init?.signal !== undefined;
		return Promise.resolve(
			new Response(
				"<p>bunx skills add https://github.com/openai/skills --skill gh-fix-ci</p>",
			),
		);
	}) as typeof fetch;
	try {
		await expect(
			fetchOfficialSkillCatalogWithTimeout(OFFICIAL_SKILLS_CATALOG_URL),
		).resolves.toHaveLength(1);
		expect(receivedSignal).toBe(false);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("official skill catalog loading supports explicit timeouts", async () => {
	const originalFetch = globalThis.fetch;
	let aborted = false;
	globalThis.fetch = ((_url: string, init?: RequestInit) => {
		return new Promise<Response>((_resolve, reject) => {
			init?.signal?.addEventListener("abort", () => {
				aborted = true;
				reject(new Error("aborted"));
			});
		});
	}) as typeof fetch;
	try {
		await expect(
			fetchOfficialSkillCatalogWithTimeout(OFFICIAL_SKILLS_CATALOG_URL, 10),
		).rejects.toThrow();
		expect(aborted).toBe(true);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("official skill catalog cache stores entries and detects unchanged content", async () => {
	const root = await mkdtemp(`${tmpdir()}/oal-officialskills-cache-`);
	const cachePath = join(root, "officialskills-catalog.json");
	const catalog = [
		{
			id: "skill-acme-bug-debug",
			publisher: "Acme",
			name: "bug-debug",
			category: "development",
			sourceStatus: "community",
			repo: "https://github.com/acme/skills",
			skill: "bug-debug",
			sourceUrl: officialSkillSourceUrl("acme", "bug-debug"),
			description: "Debug bugs.",
		},
	] as const;
	await writeOfficialSkillsCache(cachePath, catalog);
	const cached = await readOfficialSkillsCache(cachePath);
	expect(cached?.entries).toEqual([...catalog]);
	expect(sameOfficialSkillsCatalog([...catalog].reverse(), catalog)).toBe(true);
	expect(
		sameOfficialSkillsCatalog(
			[{ ...catalog[0], description: "Updated debug bugs." }],
			catalog,
		),
	).toBe(false);
});

test("optional features can install curated external skills", () => {
	const lines: string[] = [];
	const originalLog = console.log;
	console.log = (message?: unknown) => {
		lines.push(String(message));
	};
	try {
		runFeaturesCommand([
			"--install",
			"skill-openai-gh-fix-ci,skill-trailofbits-static-analysis",
		]);
	} finally {
		console.log = originalLog;
	}
	const output = lines.join("\n");
	expect(output).toContain("OpenAI gh-fix-ci [skill]");
	expect(output).toContain("Trail of Bits static-analysis [skill]");
	expect(output).toContain(
		"bunx skills add https://github.com/openai/skills --skill gh-fix-ci --yes --global",
	);
	expect(output).toContain(
		"bunx skills add https://github.com/trailofbits/skills/tree/main/plugins/static-analysis --yes --global",
	);
});

test("features command exposes curated officialskills catalog", () => {
	const lines: string[] = [];
	const originalLog = console.log;
	console.log = (message?: unknown) => {
		lines.push(String(message));
	};
	try {
		runFeaturesCommand(["--catalog"]);
	} finally {
		console.log = originalLog;
	}
	const output = lines.join("\n");
	expect(output).toContain("# OpenAgentLayer Official Skills Catalog");
	expect(output).toContain(`source: ${OFFICIAL_SKILLS_CATALOG_URL}`);
	expect(output).toContain("source status:");
	expect(output).toContain("install: bunx skills add");
});

test("features command can print compact officialskills catalog", () => {
	const lines: string[] = [];
	const originalLog = console.log;
	console.log = (message?: unknown) => {
		lines.push(String(message));
	};
	try {
		runFeaturesCommand(["--catalog", "--compact"]);
	} finally {
		console.log = originalLog;
	}
	const output = lines.join("\n");
	const parsed = JSON.parse(output) as Record<string, unknown>[];
	expect(Array.isArray(parsed)).toBe(true);
	expect(parsed.length).toBeGreaterThan(0);
	expect(parsed[0]).toHaveProperty("id");
	expect(parsed[0]).toHaveProperty("name");
	expect(parsed[0]).toHaveProperty("publisher");
	expect(parsed[0]).toHaveProperty("description");
	expect(parsed[0]).toHaveProperty("category");
	expect(parsed[0]).toHaveProperty("sourceStatus");
	expect(parsed[0]).toHaveProperty("sourceUrl");
	expect(parsed[0]).not.toHaveProperty("repo");
	expect(parsed[0]).not.toHaveProperty("skill");
});

test("features command restricts fetched catalogs to officialskills", async () => {
	await expect(
		runFeaturesCommand(["--catalog-url", "https://example.com/skills/demo"]),
	).rejects.toThrow(
		`\`--catalog-url\` must use ${OFFICIAL_SKILLS_CATALOG_URL}`,
	);
});

test("features command installs all fetched skills in a website tab", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = ((url: string) => {
		const htmlByUrl: Record<string, string> = {
			[OFFICIAL_SKILLS_CATALOG_URL]: `
				<script src="/assets/main.js"></script>
				<a href="/openai/skills/security-best-practices">Security</a>
				<a href="/cloudflare/skills/workers-best-practices">Workers</a>
				<a href="/openai/skills/gh-fix-ci">GitHub CI</a>
			`,
			[`${OFFICIAL_SKILLS_BASE_URL}/assets/main.js`]: `
				{slug:"openai/security-best-practices",name:"security-best-practices",description:"Security checks",owner:"openai",category:"security"}
				{slug:"cloudflare/workers-best-practices",name:"workers-best-practices",description:"Workers",owner:"cloudflare",category:"infrastructure"}
				{slug:"openai/gh-fix-ci",name:"gh-fix-ci",description:"GitHub CI",owner:"openai",category:"workflows"}
			`,
			[officialSkillSourceUrl("openai", "security-best-practices")]: `
				security community
				<p>bunx skills add https://github.com/openai/skills --skill security-best-practices</p>
			`,
			[officialSkillSourceUrl("cloudflare", "workers-best-practices")]: `
				infrastructure official
				<p>bunx skills add https://github.com/cloudflare/skills --skill workers-best-practices</p>
			`,
			[officialSkillSourceUrl("openai", "gh-fix-ci")]: `
				workflows official
				<p>bunx skills add https://github.com/openai/skills --skill gh-fix-ci</p>
			`,
		};
		return Promise.resolve(
			new Response(htmlByUrl[url] ?? "", {
				status: htmlByUrl[url] ? 200 : 404,
			}),
		);
	}) as typeof fetch;
	const lines: string[] = [];
	const originalLog = console.log;
	console.log = (message?: unknown) => {
		lines.push(String(message));
	};
	try {
		await runFeaturesCommand([
			"--catalog-url",
			OFFICIAL_SKILLS_CATALOG_URL,
			"--category",
			"security",
			"--install",
			"all",
		]);
	} finally {
		console.log = originalLog;
		globalThis.fetch = originalFetch;
	}
	const output = lines.join("\n");
	expect(output).toContain("OpenAI security-best-practices [skill]");
	expect(output).toContain(
		"bunx skills add https://github.com/openai/skills --skill security-best-practices --yes --global",
	);
	expect(output).not.toContain("workers-best-practices");
	expect(output).not.toContain("gh-fix-ci");
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
			OAL_CLI_ENTRY_RELATIVE,
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
