import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { loadSource } from "@openagentlayer/source";
import { parseOpenCodeModels, renderProvider } from "../src";
import { OPENCODE_MODEL_FALLBACKS } from "../src/opencode";

const repoRoot = resolve(import.meta.dir, "../../..");

test("OpenCode config renders OAL fallback models", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("opencode", graph.source, repoRoot);
	const config = JSON.parse(
		stripJsonComments(
			rendered.artifacts.find((artifact) => artifact.path === "opencode.jsonc")
				?.content ?? "{}",
		),
	) as { model: string; small_model: string; plugin: string[] };
	expect(config.plugin).toContain("./.opencode/plugins/openagentlayer.ts");
	expect(config.model).toBe(OPENCODE_MODEL_FALLBACKS[0]);
	expect(config.small_model).toBe(OPENCODE_MODEL_FALLBACKS[1]);
});

test("model plans route Greek agents by subscription", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const codex = await renderProvider("codex", graph.source, repoRoot, {
		plan: "pro-20",
	});
	const athena = codex.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/athena.toml",
	)?.content;
	expect(athena).toContain('model = "gpt-5.5"');
	expect(athena).toContain('model_reasoning_effort = "high"');
	const hermes = codex.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/hermes.toml",
	)?.content;
	expect(hermes).toContain('model = "gpt-5.5"');
	expect(hermes).toContain('model_reasoning_effort = "high"');
	const hephaestus = codex.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/hephaestus.toml",
	)?.content;
	expect(hephaestus).toContain('model = "gpt-5.3-codex"');
	expect(hephaestus).toContain('model_reasoning_effort = "high"');

	const claude = await renderProvider("claude", graph.source, repoRoot, {
		plan: "max-20-long",
	});
	const nemesis = claude.artifacts.find(
		(artifact) => artifact.path === ".claude/agents/nemesis.md",
	)?.content;
	expect(nemesis).toContain("model: claude-opus-4-6[1m]");
});

test("OpenCode model detection uses allowed auth models and free fallbacks", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const detected = parseOpenCodeModels(`opencode/gpt-5.5
opencode/gpt-5.4
opencode/gpt-5.3-codex
opencode/gpt-5.3-codex-spark
opencode/claude-opus-4-7
opencode/claude-sonnet-4-6
opencode/nemotron-3-super-free
`);
	const auth = await renderProvider("opencode", graph.source, repoRoot, {
		plan: "opencode-auto",
		opencodeModels: detected,
	});
	const config = JSON.parse(
		stripJsonComments(
			auth.artifacts.find((artifact) => artifact.path === "opencode.jsonc")
				?.content ?? "{}",
		),
	) as { agent: Record<string, { model: string }> };
	expect(config.agent["athena"]?.model).toBe("opencode/gpt-5.5");
	expect(config.agent["hephaestus"]?.model).toBe("opencode/gpt-5.3-codex");
	expect(JSON.stringify(config)).not.toContain('opencode/gpt-5.4"');
	expect(JSON.stringify(config)).not.toContain("opencode/gpt-5.3-codex-spark");

	const free = await renderProvider("opencode", graph.source, repoRoot, {
		plan: "opencode-free",
	});
	const freeConfig = JSON.parse(
		stripJsonComments(
			free.artifacts.find((artifact) => artifact.path === "opencode.jsonc")
				?.content ?? "{}",
		),
	) as { agent: Record<string, { model: string }> };
	expect(
		Object.values(freeConfig.agent).every((agent) =>
			OPENCODE_MODEL_FALLBACKS.includes(
				agent.model as (typeof OPENCODE_MODEL_FALLBACKS)[number],
			),
		),
	).toBe(true);
});

test("Codex source models split intelligence from worker agents", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	for (const agent of graph.source.agents.filter((record) =>
		record.providers.includes("codex"),
	)) {
		const expected = agent.tools.includes("write")
			? "gpt-5.3-codex"
			: "gpt-5.5";
		expect(agent.models.codex).toBe(expected);
	}
});

test("provider skill artifacts render authored OAL skill prompts", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	for (const [skill, expected] of [
		["caveman", "Use compact output"],
		["taste", "Improve product UI"],
		["oal", "oal codex peer batch <task>"],
	] as const) {
		for (const provider of ["codex", "claude", "opencode"] as const) {
			const rendered = await renderProvider(provider, graph.source, repoRoot);
			const artifact = rendered.artifacts.find((candidate) =>
				candidate.path.endsWith(`/${skill}/SKILL.md`),
			);
			expect(artifact?.content).toContain(expected);
			expect(artifact?.content).toContain("## Prompt contract");
			if (provider === "codex" && skill === "oal") {
				expect(artifact?.content).toContain(
					"spawn custom agents by their rendered OAL agent name",
				);
				expect(artifact?.content).not.toContain("oal codex agent <agent>");
			}
		}
	}
	for (const provider of ["codex", "claude", "opencode"] as const) {
		const rendered = await renderProvider(provider, graph.source, repoRoot);
		const artifact = rendered.artifacts.find((candidate) =>
			candidate.path.endsWith("/css-modern-features/SKILL.md"),
		);
		expect(artifact?.content).toContain("Modern CSS Skill");
		expect(artifact?.content).toContain("container queries");
		const impeccable = rendered.artifacts.find((candidate) =>
			candidate.path.endsWith("/impeccable/SKILL.md"),
		);
		const brandReference = rendered.artifacts.find((candidate) =>
			candidate.path.endsWith("/impeccable/reference/brand.md"),
		);
		const loadContextScript = rendered.artifacts.find((candidate) =>
			candidate.path.endsWith("/impeccable/scripts/load-context.mjs"),
		);
		const designWorker = rendered.artifacts.find((candidate) =>
			candidate.path.endsWith("/design-worker/SKILL.md"),
		);
		const designWorkerReference = rendered.artifacts.find((candidate) =>
			candidate.path.endsWith("/design-worker/references/worker.md"),
		);
		expect(impeccable?.content).toContain("IMPECCABLE_PREFLIGHT");
		expect(brandReference?.content).toContain("Brand");
		expect(loadContextScript?.content).toContain("PRODUCT.md");
		expect(designWorker?.content).toContain("Design Worker");
		expect(designWorkerReference?.content).toContain("Worker");
	}
});

test("provider instructions render inspection and correction discipline contracts", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	for (const [provider, path] of [
		["codex", "AGENTS.md"],
		["claude", "CLAUDE.md"],
		["opencode", ".opencode/instructions/openagentlayer.md"],
	] as const) {
		const rendered = await renderProvider(provider, graph.source, repoRoot);
		const instructions = rendered.artifacts.find(
			(artifact) => artifact.path === path,
		)?.content;
		expect(instructions).toContain("Source of truth:");
		expect(instructions).toContain("Change source:");
		expect(instructions).toContain("Provider-native behavior:");
		expect(instructions).toContain("Context budget:");
		expect(instructions).toContain("- implement:");
		if (provider === "codex") {
			expect(instructions).toContain("Codex Base Instructions");
			expect(instructions).toContain(
				".codex/openagentlayer/codex-base-instructions.md",
			);
			expect(instructions).toContain("upstream `openai/codex` `default.md`");
			expect(instructions).not.toContain("model_instructions_file");
		} else {
			expect(instructions).not.toContain("Codex Base Instructions");
		}
		expect(instructions).not.toContain("Codex baseline");
		expect(instructions).not.toContain("Instruction reload surface:");
	}
});

test("provider agents render inspection and correction discipline contracts", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	for (const [provider, path] of [
		["codex", ".codex/agents/hephaestus.toml"],
		["claude", ".claude/agents/hephaestus.md"],
		["opencode", ".opencode/agents/hephaestus.md"],
	] as const) {
		const rendered = await renderProvider(provider, graph.source, repoRoot);
		const agent = rendered.artifacts.find(
			(artifact) => artifact.path === path,
		)?.content;
		expect(agent).toContain(
			"senior peer for Production implementation, refactoring, and bug fixing",
		);
		expect(agent).toContain("Own routes: implement.");
		expect(agent).toContain("Inspect controlling source only");
		expect(agent).toContain(
			"prefer concise evidence over repeated policy text",
		);
		expect(agent).toContain("## Prompt contract");
		expect(agent).toContain("Inspect only source needed");
		expect(agent).toContain("smallest current-state change");
		expect(agent).toContain("Validate only when");
		if (provider === "codex") {
			expect(agent).toContain('name = "hephaestus"');
			expect(agent).toContain("description = ");
			expect(agent).toContain('nickname_candidates = ["hephaestus"]');
		}
	}
});

test("continuity agent and resume route render user-pasteable handoff contracts", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	for (const [provider, path] of [
		["codex", ".codex/agents/mnemosyne.toml"],
		["claude", ".claude/agents/mnemosyne.md"],
		["opencode", ".opencode/agents/mnemosyne.md"],
	] as const) {
		const rendered = await renderProvider(provider, graph.source, repoRoot);
		const agent = rendered.artifacts.find(
			(artifact) => artifact.path === path,
		)?.content;
		expect(agent).toContain(
			"senior peer for Memory, handoff, and session continuity",
		);
		expect(agent).toContain("Own routes: resume.");
		expect(agent).toContain(
			"work requires continuation state and handoff safety",
		);
	}
});

test("orchestration agents render concrete delegation task contracts", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	for (const [provider, path] of [
		["codex", ".codex/agents/odysseus.toml"],
		["claude", ".claude/agents/odysseus.md"],
		["opencode", ".opencode/agents/odysseus.md"],
	] as const) {
		const rendered = await renderProvider(provider, graph.source, repoRoot);
		const agent = rendered.artifacts.find(
			(artifact) => artifact.path === path,
		)?.content;
		expect(agent).toContain(
			"senior peer for Orchestration, delegation, and multi-agent sequencing",
		);
		expect(agent).toContain("For broad work, route independent tasks through");
		expect(agent).toContain("merge only final evidence");
		if (provider === "codex") {
			expect(agent).toContain('model = "gpt-5.5"');
			expect(agent).toContain('sandbox_mode = "read-only"');
		}
	}
});

test("Claude agents render provider-native tools for delegation", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("claude", graph.source, repoRoot);
	const odysseus = rendered.artifacts.find(
		(artifact) => artifact.path === ".claude/agents/odysseus.md",
	)?.content;
	expect(odysseus).toContain("tools: Read, Grep, Glob, Bash, Task");
	const hephaestus = rendered.artifacts.find(
		(artifact) => artifact.path === ".claude/agents/hephaestus.md",
	)?.content;
	expect(hephaestus).toContain(
		"tools: Read, Grep, Glob, Bash, Edit, MultiEdit, Write, Task",
	);
});

test("Codex default render uses normal shell and hook-based RTK enforcement", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("codex", graph.source, repoRoot);
	const config = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(
		config?.startsWith(
			"#:schema https://developers.openai.com/codex/config-schema.json",
		),
	).toBe(true);
	expect(config).toContain(
		"#:schema https://developers.openai.com/codex/config-schema.json",
	);
	expect(config).not.toContain("zsh_path");
	expect(config).not.toContain("codex_hooks");
	expect(config).toContain('profile = "openagentlayer-symphony"');
	expect(config).toContain("[profiles.openagentlayer-symphony]");
	expect(config).toContain("[profiles.openagentlayer-symphony.features]");
	expect(config).toContain("[profiles.openagentlayer-symphony-implement]");
	expect(config).toContain("[profiles.openagentlayer-symphony-utility]");
	expect(config).toContain(
		'model_instructions_file = "./openagentlayer/codex-base-instructions.md"',
	);
	expect(config).toContain('[memories]\nextract_model = "gpt-5.4-mini"');
	expect(config).toContain("[features]\nsteer = true");
	expect(config).toContain('model_verbosity = "low"');
	expect(config).toContain("apps = true");
	expect(config).toContain("shell_zsh_fork = false");
	expect(config).toContain("enable_fanout = false");
	expect(config).toContain("multi_agent = false");
	expect(config).toContain("multi_agent_v2 = false");
	expect(config).toContain("max_threads = 1");
	expect(config).toContain("job_max_runtime_seconds = 1800");
	expect(config).toContain("[tui]");
	const requirements = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/requirements.toml",
	)?.content;
	expect(requirements).toContain("[features]\nhooks = true");
	expect(requirements).not.toContain("codex_hooks");
	expect(requirements).toContain(
		'managed_dir = "__OAL_CODEX_MANAGED_HOOK_DIR__"',
	);
	expect(requirements).toContain(
		"__OAL_CODEX_MANAGED_HOOK_DIR__/enforce-rtk-commands.mjs",
	);
	expect(requirements).toContain("OAL_HOOK_PROVIDER=codex");
	expect(requirements).toContain("OAL_HOOK_EVENT=PreToolUse");
	const baseInstructions = rendered.artifacts.find(
		(artifact) =>
			artifact.path === ".codex/openagentlayer/codex-base-instructions.md",
	)?.content;
	expect(baseInstructions).toContain(
		"Do not run tests, type checks, builds, simulator launches, browser automation, or full validation suites after every implementation step by default.",
	);
	expect(baseInstructions).toContain("OAL and RTK project surfaces");
	expect(baseInstructions).toContain("rtk proxy -- <command>");
	expect(baseInstructions).toContain("OAL parent-session quota guard");
	expect(baseInstructions).toContain("oal codex-usage --project <path>");
	expect(baseInstructions).toContain("session-complete\nhandoff");
	expect(baseInstructions).toContain("COMPLETE-complete");
	expect(baseInstructions).toContain("Code review and audits");
	expect(baseInstructions).toContain(
		"Keep review output findings-only\nand bounded",
	);
	expect(baseInstructions).toContain(
		"Unknown or potentially large command output must be bounded before it reaches context.",
	);
	for (const item of [
		"model-with-reasoning",
		"run-state",
		"git-branch",
		"task-progress",
		"context-remaining",
		"used-tokens",
	]) {
		expect(config).toContain(`"${item}"`);
	}
	expect(config).not.toContain('"five-hour-limit"');
	expect(config).not.toContain('"weekly-limit"');
	expect(config).not.toContain('"session-id"');
	expect(config).not.toContain('"total-input-tokens"');
	expect(
		rendered.artifacts.some((artifact) => artifact.path.includes("/shim/")),
	).toBe(false);
	expect(
		rendered.artifacts.some(
			(artifact) =>
				artifact.path ===
				".codex/openagentlayer/hooks/enforce-rtk-commands.mjs",
		),
	).toBe(true);
	const instructions = rendered.artifacts.find(
		(artifact) => artifact.path === "AGENTS.md",
	)?.content;
	expect(instructions).toContain("Context budget:");
	expect(instructions).toContain("- orchestrate:");
	expect(instructions).not.toContain("Subagent surface:");
	const hooks = JSON.parse(
		rendered.artifacts.find((artifact) => artifact.path === ".codex/hooks.json")
			?.content ?? "{}",
	) as { hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>> };
	expect(
		hooks.hooks["SubagentStart"]?.some((group) =>
			group.hooks.some((hook) =>
				hook.command.includes("inject-subagent-context.mjs"),
			),
		),
	).toBe(true);
});

test("Codex Plus plan routes intelligence to GPT-5.5 and workers to GPT-5.3", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("codex", graph.source, repoRoot, {
		plan: "plus",
	});
	const config = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(config).toContain(
		'[profiles.openagentlayer-symphony]\nmodel = "gpt-5.5"',
	);
	expect(config).toContain('plan_mode_reasoning_effort = "medium"');
	expect(config).toContain('model_reasoning_effort = "medium"');
	expect(config).toContain(
		'[profiles.openagentlayer-symphony-implement]\nmodel = "gpt-5.3-codex"',
	);
	expect(config).toContain(
		'[profiles.openagentlayer-symphony-utility]\nmodel = "gpt-5.4-mini"',
	);
	expect(config).toContain('plan_mode_reasoning_effort = "low"');
	expect(config).not.toContain("xhigh");
	const athena = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/athena.toml",
	)?.content;
	expect(athena).toContain('model = "gpt-5.5"');
	expect(athena).toContain('model_reasoning_effort = "high"');
	const hephaestus = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/hephaestus.toml",
	)?.content;
	expect(hephaestus).toContain('model = "gpt-5.3-codex"');
	expect(hephaestus).toContain('model_reasoning_effort = "medium"');
});

test("Codex native orchestration modes render bounded settings", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const stable = await renderProvider("codex", graph.source, repoRoot, {
		codexOrchestration: {
			mode: "multi_agent",
			maxDepth: 2,
			maxThreads: 3,
			jobMaxRuntimeSeconds: 120,
		},
	});
	const stableConfig = stable.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(stableConfig).toContain('profile = "openagentlayer-multi-agent"');
	expect(stableConfig).toContain("[profiles.openagentlayer-multi-agent]");
	expect(stableConfig).toContain(
		"[profiles.openagentlayer-multi-agent.features]",
	);
	expect(stableConfig).toContain("apps = false");
	expect(stableConfig).toContain("multi_agent = true");
	expect(stableConfig).toContain("multi_agent_v2 = false");
	expect(stableConfig).toContain("max_depth = 2");
	expect(stableConfig).toContain("max_threads = 3");
	expect(stableConfig).toContain("job_max_runtime_seconds = 120");

	const v2 = await renderProvider("codex", graph.source, repoRoot, {
		codexOrchestration: {
			mode: "multi_agent_v2",
			maxDepth: 2,
			maxThreads: 4,
			multiAgentV2: {
				minWaitTimeoutMs: 250,
				hideSpawnAgentMetadata: true,
				usageHintEnabled: true,
				usageHintText: "Use sparingly.",
				rootAgentUsageHintText: "Parent owns merge.",
				subagentUsageHintText: "Return evidence.",
			},
		},
	});
	const v2Config = v2.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(v2Config).toContain('profile = "openagentlayer-multi-agent-v2"');
	expect(v2Config).toContain("[profiles.openagentlayer-multi-agent-v2]");
	expect(v2Config).toContain(
		"[profiles.openagentlayer-multi-agent-v2.features]",
	);
	expect(v2Config).toContain("apps = false");
	expect(v2Config).toContain("multi_agent = false");
	expect(v2Config).toContain("max_depth = 2");
	expect(v2Config).not.toContain("max_threads = 4");
	expect(v2Config).toContain(
		"multi_agent_v2 = { enabled = true, max_concurrent_threads_per_session = 4",
	);
	expect(v2Config).toContain("min_wait_timeout_ms = 250");
	expect(v2Config).toContain('usage_hint_text = "Use sparingly."');
});

test("Codex renders hooks only in hooks.json with provider event env", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("codex", graph.source, repoRoot);
	const config = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(config).not.toContain("[hooks]");
	const hooks = JSON.parse(
		rendered.artifacts.find((artifact) => artifact.path === ".codex/hooks.json")
			?.content ?? "{}",
	) as { hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>> };
	expect(hooks.hooks["PreToolUse"]?.[0]?.hooks[0]?.command).toContain(
		"OAL_HOOK_PROVIDER=codex OAL_HOOK_EVENT=PreToolUse",
	);
	expect(
		hooks.hooks["SessionStart"]?.some((group) =>
			group.hooks.some((hook) =>
				hook.command.includes("inject-session-scope.mjs"),
			),
		),
	).toBe(true);
});

test("Claude renders every authored hook event with provider event env", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("claude", graph.source, repoRoot);
	const settings = JSON.parse(
		rendered.artifacts.find(
			(artifact) => artifact.path === ".claude/settings.json",
		)?.content ?? "{}",
	) as { hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>> };
	expect(
		settings.hooks["SessionStart"]?.some((group) =>
			group.hooks.some((hook) =>
				hook.command.includes("inject-session-scope.mjs"),
			),
		),
	).toBe(true);
	expect(settings.hooks["Stop"]?.length).toBeGreaterThan(1);
	expect(settings.hooks["SubagentStop"]?.[0]?.hooks[0]?.command).toContain(
		"OAL_HOOK_PROVIDER=claude OAL_HOOK_EVENT=SubagentStop",
	);
});

test("OpenCode renders real OAL command policy and RTK tools", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("opencode", graph.source, repoRoot);
	const policyTool = rendered.artifacts.find(
		(artifact) => artifact.path === ".opencode/tools/command_policy_check.ts",
	)?.content;
	expect(policyTool).toContain("@opencode-ai/plugin");
	expect(policyTool).toContain("evaluateCommandPolicy");
	expect(policyTool).toContain("tool.schema.string()");
	const rtkTool = rendered.artifacts.find(
		(artifact) => artifact.path === ".opencode/tools/rtk_report.ts",
	)?.content;
	expect(rtkTool).toContain("oal rtk-report --project");
	const surfaceTool = rendered.artifacts.find(
		(artifact) => artifact.path === ".opencode/tools/provider_surface_map.ts",
	)?.content;
	expect(surfaceTool).toContain('["oal", "inspect", "capabilities"]');
	const manifestTool = rendered.artifacts.find(
		(artifact) => artifact.path === ".opencode/tools/manifest_inspect.ts",
	)?.content;
	expect(manifestTool).toContain('["oal", "inspect", "manifest"]');
	const plugin = rendered.artifacts.find(
		(artifact) => artifact.path === ".opencode/plugins/openagentlayer.ts",
	)?.content;
	expect(plugin).toContain("export const OpenAgentLayerPlugin");
	expect(plugin).not.toContain("export default OpenAgentLayerPlugin");
	expect(plugin).toContain('"tool.execute.before"');
	expect(plugin).toContain('"tool.execute.after"');
	expect(plugin).toContain("styleHookMessage");
	expect(plugin).toContain("styleHookLines");
	expect(plugin).toContain("evaluateCommandPolicy");
	expect(plugin).toContain("evaluateSecretGuard");
	expect(plugin).toContain("evaluateDestructiveCommand");
	expect(plugin).toContain("evaluateUnsafeGit");
	expect(plugin).toContain("evaluateFailureLoop");
	expect(plugin).toContain("output.args.command = replacement");
	expect(plugin).toContain("blockIfNeeded(evaluateFailureLoop(output ?? {}))");
	expect(plugin).not.toContain("output.metadata");
});

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}
