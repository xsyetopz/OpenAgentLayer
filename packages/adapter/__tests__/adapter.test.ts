import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { loadSource } from "@openagentlayer/source";
import { parseOpenCodeModels, renderProvider } from "../src";
import {
	OPENCODE_MODEL_FALLBACKS,
	openCodeCommitIdentity,
} from "../src/opencode";

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
	const codexConfig = codex.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(codexConfig).toContain(
		'[profiles.openagentlayer-multi-agent-v2]\nmodel = "gpt-5.5"',
	);
	expect(codexConfig).toContain(
		'[profiles.openagentlayer-multi-agent-v2-implement]\nmodel = "gpt-5.3-codex"',
	);
	expect(codexConfig).toContain('model_reasoning_effort = "xhigh"');
	const athena = codex.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/athena.toml",
	)?.content;
	expect(athena).toContain('model = "gpt-5.5"');
	expect(athena).toContain('model_reasoning_effort = "high"');
	const hermes = codex.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/hermes.toml",
	)?.content;
	expect(hermes).toContain('model = "gpt-5.5"');
	expect(hermes).toContain('model_reasoning_effort = "medium"');
	const hephaestus = codex.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/hephaestus.toml",
	)?.content;
	expect(hephaestus).toContain('model = "gpt-5.3-codex"');
	expect(hephaestus).toContain('model_reasoning_effort = "xhigh"');
	const apollo = codex.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/apollo.toml",
	)?.content;
	expect(apollo).toContain('model = "gpt-5.3-codex"');
	expect(apollo).toContain('model_reasoning_effort = "xhigh"');

	const codexPro5 = await renderProvider("codex", graph.source, repoRoot, {
		plan: "pro-5",
	});
	const pro5Hephaestus = codexPro5.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/hephaestus.toml",
	)?.content;
	expect(pro5Hephaestus).toContain('model_reasoning_effort = "xhigh"');
	const pro5Apollo = codexPro5.artifacts.find(
		(artifact) => artifact.path === ".codex/agents/apollo.toml",
	)?.content;
	expect(pro5Apollo).toContain('model_reasoning_effort = "high"');

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
	const athenaAgent = auth.artifacts.find(
		(artifact) => artifact.path === ".opencode/agents/athena.md",
	)?.content;
	expect(athenaAgent).toContain("Co-authored-by: GPT-5.5 <noreply@openai.com>");
	const apolloAgent = auth.artifacts.find(
		(artifact) => artifact.path === ".opencode/agents/apollo.md",
	)?.content;
	expect(apolloAgent).toContain(
		"Co-authored-by: GPT-5.3 Codex <noreply@openai.com>",
	);

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

test("provider commit attribution renders for Claude and OpenCode", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const claude = await renderProvider("claude", graph.source, repoRoot);
	const settings = JSON.parse(
		claude.artifacts.find(
			(artifact) => artifact.path === ".claude/settings.json",
		)?.content ?? "{}",
	) as { attribution?: { commit?: string; pr?: string } };
	expect(settings.attribution?.commit).toContain(
		"Co-authored-by: Claude <noreply@anthropic.com>",
	);
	expect(settings.attribution?.pr).toBe("");
	const commitSkill = claude.artifacts.find(
		(artifact) => artifact.path === ".claude/skills/commit/SKILL.md",
	)?.content;
	expect(commitSkill).toContain("Claude <noreply@anthropic.com>");
	expect(commitSkill).toContain("OpenCode: use the current agent model");
	const opencode = await renderProvider("opencode", graph.source, repoRoot, {
		plan: "opencode-auto",
		opencodeModels: ["opencode/claude-sonnet-4-6"],
	});
	const apolloAgent = opencode.artifacts.find(
		(artifact) => artifact.path === ".opencode/agents/apollo.md",
	)?.content;
	expect(apolloAgent).toContain(
		"Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
	);

	expect(openCodeCommitIdentity("opencode/gpt-5.3-codex")).toBe(
		"GPT-5.3 Codex <noreply@openai.com>",
	);
	expect(openCodeCommitIdentity("opencode/claude-opus-4-6[1m]")).toBe(
		"Claude Opus 4.6 <noreply@anthropic.com>",
	);
	expect(openCodeCommitIdentity("opencode/nemotron-3-super-free")).toBe(
		"Nemotron 3 Super Free <noreply@opencode.ai>",
	);
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
					"explicitly spawn rendered OAL agent names or aliases",
				);
				expect(artifact?.content).toContain("OAL's index skill for AI/LLM use");
				expect(artifact?.content).toContain("CSV/batch subagents");
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
		expect(instructions).toContain("Shared workspace:");
		expect(instructions).toContain("not alone in the codebase");
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
		expect(agent).toContain("## Narrow Agent Contract");
		expect(agent).toContain(
			"Job: Production implementation, refactoring, and bug fixing.",
		);
		expect(agent).toContain(
			"Use only these tools: read, search, shell, write, patch.",
		);
		expect(agent).toContain(
			"Stay narrow: do not drift into adjacent route ownership",
		);
		expect(agent).toContain("unexplained existing changes are user-owned");
		expect(agent).toContain("behavior claims require source evidence");
		expect(agent).toContain("STATUS BLOCKED");
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
	expect(config).toContain('profile = "openagentlayer-multi-agent-v2"');
	expect(config).toContain("[profiles.openagentlayer-multi-agent-v2]");
	expect(config).toContain("[profiles.openagentlayer-multi-agent-v2.features]");
	expect(config).toContain(
		"[profiles.openagentlayer-multi-agent-v2-implement]",
	);
	expect(config).toContain("[profiles.openagentlayer-multi-agent-v2-utility]");
	expect(config).toContain(
		'model_instructions_file = "./openagentlayer/codex-base-instructions.md"',
	);
	expect(config).toContain("developer_instructions =");
	expect(config).toContain(
		"## Mandatory Output Gate: Defensive Contrast Check",
	);
	expect(config).toContain(
		"## Mandatory Output Gate: Prevent Implementation-Context Leakage",
	);
	expect(config).toContain('[memories]\nextract_model = "gpt-5.4-mini"');
	expect(config).toContain("[features]\nsteer = true");
	expect(config).toContain('model_verbosity = "low"');
	expect(config).toContain("apps = false");
	expect(config).toContain("shell_zsh_fork = false");
	expect(config).toContain("enable_fanout = false");
	expect(config).toContain("multi_agent = false");
	expect(config).toContain(
		"multi_agent_v2 = { enabled = true, max_concurrent_threads_per_session = 4",
	);
	expect(config).not.toContain("max_threads = 1");
	expect(config).toContain("root_agent_usage_hint_text");
	expect(config).toContain("Assume native subagents are encouraged");
	expect(config).toContain("significant or separable coding implementation");
	expect(config).toContain("GPT-5.3-Codex implementation agents");
	expect(config).toContain("instead of doing all edits in the GPT-5.5 parent");
	expect(config).toContain("fit the runtime cap");
	expect(config).toContain("subagent_usage_hint_text");
	expect(config).toContain("bounded assigned task within the runtime cap");
	expect(config).toContain('nickname_candidates = ["hephaestus", "implement"]');
	expect(config).toContain(
		'nickname_candidates = ["atalanta", "test", "validate", "accept"]',
	);
	expect(config).toContain("job_max_runtime_seconds = 600");
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
	expect(baseInstructions).toContain("Be respectful but not deferential");
	expect(baseInstructions).toContain(
		"do not add emotional validation, people-pleasing agreement, or apology-centered phrasing",
	);
	expect(baseInstructions).toContain(
		"Push back on requests, names, designs, or assumptions",
	);
	expect(baseInstructions).toContain(
		"Do not paper over symptoms with compatibility shims, aliases, parser fallbacks",
	);
	expect(baseInstructions).toContain(
		"Do not add adjacent behavior, hidden fallback paths, defensive layers",
	);
	expect(baseInstructions).toContain(
		"Do not widen scope to make a partial solution look complete",
	);
	expect(baseInstructions).toContain(
		"Do not run tests, type checks, builds, simulator launches, browser automation, or full validation suites after every implementation step by default.",
	);
	expect(baseInstructions).toContain("OAL and RTK project surfaces");
	expect(baseInstructions).toContain("rtk proxy -- <command>");
	expect(baseInstructions).not.toContain("OAL scope fidelity");
	expect(baseInstructions).toContain(
		"documentation-only work unless the user explicitly asks",
	);
	expect(baseInstructions).toContain(
		"implementation request into future-work documentation",
	);
	expect(baseInstructions).toContain(
		"add concise end-user copy where the behavior is selected or explained",
	);
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
	const cargoShim = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/shim/cargo",
	);
	expect(cargoShim?.executable).toBe(true);
	expect(cargoShim?.content).toContain("exec rtk cargo");
	const rgShim = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/shim/rg",
	);
	expect(rgShim?.content).toContain("exec rtk grep");
	const ackShim = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/shim/ack",
	);
	expect(ackShim?.executable).toBe(true);
	expect(ackShim?.content).toContain("command -v rg");
	expect(ackShim?.content).toContain('exec rg "$@"');
	expect(ackShim?.content).toContain('exec ack "$@"');
	const exaShim = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/shim/exa",
	);
	expect(exaShim?.content).toContain("command -v eza");
	expect(
		rendered.artifacts.some((artifact) => artifact.path === ".codex/shim/time"),
	).toBe(false);
	const commonShell = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/scripts/common.sh",
	)?.content;
	expect(commonShell).toContain('shim_dir_codex="$HOME/.codex/shim"');
	expect(commonShell).not.toContain("/opt/homebrew/shim");
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

test("Codex instructions render subagent invocation roster", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("codex", graph.source, repoRoot);
	const instructions = rendered.artifacts.find(
		(artifact) => artifact.path === "AGENTS.md",
	)?.content;
	expect(instructions).toContain("## Codex Subagents");
	expect(instructions).toContain(
		"OAL treats native Codex subagents as the default path",
	);
	expect(instructions).toContain(
		"users should not need to request them manually",
	);
	expect(instructions).toContain(
		"Before starting broad work, split independent sidecar tasks",
	);
	expect(instructions).toContain(
		"For coding implementation, prefer spawning the rendered GPT-5.3-Codex implementation agents",
	);
	expect(instructions).toContain(
		"do not rely on lower GPT-5.5 reasoning effort as a cost control for constantly running goal loops",
	);
	expect(instructions).toContain("fit the configured job runtime cap");
	expect(instructions).toContain(
		"- hephaestus: aliases=hephaestus, implement; routes=implement",
	);
	expect(instructions).toContain(
		"- atalanta: aliases=atalanta, test, validate, accept; routes=test, validate, accept",
	);
	expect(instructions).toContain("For many similar rows, create a CSV");
	expect(instructions).toContain(
		".codex/openagentlayer/codex-base-instructions.md",
	);
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
		'[profiles.openagentlayer-multi-agent-v2]\nmodel = "gpt-5.5"',
	);
	expect(config).toContain('plan_mode_reasoning_effort = "medium"');
	expect(config).toContain('model_reasoning_effort = "medium"');
	expect(config).toContain(
		'[profiles.openagentlayer-multi-agent-v2-implement]\nmodel = "gpt-5.3-codex"',
	);
	expect(config).toContain('plan_mode_reasoning_effort = "medium"');
	expect(config).toContain(
		'[profiles.openagentlayer-multi-agent-v2-utility]\nmodel = "gpt-5.4-mini"',
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

test("Codex orchestration thread caps follow subscription plan", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const plusV1 = await renderProvider("codex", graph.source, repoRoot, {
		codexPlan: "plus",
		codexOrchestration: { mode: "multi_agent", maxThreads: 99 },
	});
	const plusV1Config = plusV1.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(plusV1Config).toContain("max_threads = 2");
	expect(plusV1Config).toContain("job_max_runtime_seconds = 300");

	const pro5V2 = await renderProvider("codex", graph.source, repoRoot, {
		codexPlan: "pro-5",
		codexOrchestration: {
			mode: "multi_agent_v2",
			maxThreads: 99,
			multiAgentV2: { maxConcurrentThreadsPerSession: 99 },
		},
	});
	const pro5V2Config = pro5V2.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(pro5V2Config).toContain("max_concurrent_threads_per_session = 4");
	expect(pro5V2Config).toContain("job_max_runtime_seconds = 600");

	const pro20V1 = await renderProvider("codex", graph.source, repoRoot, {
		codexPlan: "pro-20",
		codexOrchestration: { mode: "multi_agent" },
	});
	const pro20V1Config = pro20V1.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(pro20V1Config).toContain("max_threads = 6");
	expect(pro20V1Config).toContain("job_max_runtime_seconds = 900");

	const minClamp = await renderProvider("codex", graph.source, repoRoot, {
		codexPlan: "pro-20",
		codexOrchestration: {
			mode: "multi_agent_v2",
			maxThreads: 0,
			multiAgentV2: { maxConcurrentThreadsPerSession: 0 },
		},
	});
	const minClampConfig = minClamp.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(minClampConfig).toContain("max_concurrent_threads_per_session = 1");
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
