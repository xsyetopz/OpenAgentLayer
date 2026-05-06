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
	expect(athena).toContain('model_reasoning_effort = "medium"');
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
		expect(instructions).toContain("Repository inspection:");
		expect(instructions).toContain("git ls-files");
		expect(instructions).toContain("Correction discipline:");
		expect(instructions).toContain("verify before accepting a correction");
		expect(instructions).toContain(
			"Examples, corrections, suggested names, and partial ideas are input evidence for the requested behavior only",
		);
		expect(instructions).toContain(
			"Treat inferred compatibility, aliases, fallbacks, extra behavior, guardrails, docs, and cleanup as out of scope",
		);
		expect(instructions).toContain("Delegation discipline:");
		expect(instructions).toContain(
			"broad implementation work starts with a delegation check",
		);
		expect(instructions).toContain("Continuity discipline:");
		expect(instructions).toContain("Continuation Record");
		expect(instructions).toContain(
			"current user messages and verified repo evidence",
		);
		expect(instructions).toContain("instruction reload semantics");
		expect(instructions).toContain("skills reload semantics");
		expect(instructions).toContain("Keep stable invariants");
		if (provider === "codex") {
			expect(instructions).toContain("Instruction reload surface:");
			expect(instructions).toContain("session-loaded project guidance");
			expect(instructions).toContain("reads invoked skill bodies from disk");
			expect(instructions).toContain(
				"OAL no longer enables Codex `multi_agent_v2`",
			);
			expect(instructions).toContain(
				"The parent thread owns task split, child launch, evidence merge, and final decision",
			);
		}
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
		expect(agent).toContain("Repository inspection:");
		expect(agent).toContain("git ls-files");
		expect(agent).toContain("Correction discipline:");
		expect(agent).toContain("verify before accepting a correction");
		expect(agent).toContain(
			"examples, corrections, suggested names, and partial ideas are input evidence for the requested behavior only",
		);
		expect(agent).toContain(
			"use bounded python3 rewrites for broad mechanical changes",
		);
		expect(agent).toContain(
			"inferred compatibility enters only through explicit user request or controlling source requirement",
		);
		expect(agent).toContain("Delegation check:");
		expect(agent).toContain(
			"broad implementation work uses subagents or the orchestrate route",
		);
		expect(agent).toContain(
			"narrow single-owner edits begin with a recorded solo ownership reason",
		);
		expect(agent).toContain("Continuity check:");
		expect(agent).toContain("short user-visible Continuation Record");
		expect(agent).toContain("instruction reload semantics");
		expect(agent).toContain("skills reload semantics");
		expect(agent).toContain("Keep stable invariants");
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
		expect(agent).toContain("user-pasteable Continuation Records");
		expect(agent).toContain("produce a short Continuation Record");
		expect(agent).toContain("current user messages and verified repo evidence");
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
		expect(agent).toContain("Broad implementation work");
		expect(agent).toContain("Record subagent task");
		expect(agent).toContain("owned paths");
		expect(agent).toContain("merge order");
		if (provider === "codex") {
			expect(agent).toContain("explicitly ask Codex to spawn subagents");
			expect(agent).toContain("have rendered OAL agents");
			expect(agent).toContain(
				"The parent thread owns task split, child launch, evidence merge, and final decision",
			);
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
	expect(config).not.toContain("zsh_path");
	expect(config).not.toContain("model_instructions_file");
	expect(config).toContain("[memories]\nextract_model = \"gpt-5.4-mini\"");
	expect(config).toContain("[features]\nsteer = true");
	expect(config).toContain('model_verbosity = "low"');
	expect(config).toContain("shell_zsh_fork = false");
	expect(config).toContain("enable_fanout = false");
	expect(config).toContain("multi_agent = false");
	expect(config).toContain("multi_agent_v2 = false");
	expect(config).toContain("max_threads = 6");
	expect(config).toContain("job_max_runtime_seconds = 1800");
	expect(config).toContain("[tui]");
	for (const item of [
		"model-with-reasoning",
		"task-progress",
		"context-remaining",
		"five-hour-limit",
		"weekly-limit",
	]) {
		expect(config).toContain(`"${item}"`);
	}
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
	expect(instructions).toContain("Subagent surface:");
	expect(instructions).toContain(
		"OAL no longer enables Codex `multi_agent_v2`, `multi_agent`, or fanout",
	);
	expect(instructions).toContain(
		"`multi_agent_v2` rejects OAL's `agents.max_threads` throttle",
	);
	expect(instructions).toContain(
		"stable `multi_agent` is reserved for explicit operator opt-in",
	);
	expect(instructions).toContain("Use Symphony or peer-thread orchestration");
});

test("Codex agent concurrency scales by subscription plan", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	for (const [plan, maxThreads, jobRuntime] of [
		["plus", 2, 600],
		["pro-5", 4, 900],
		["pro-20", 6, 1800],
	] as const) {
		const rendered = await renderProvider("codex", graph.source, repoRoot, {
			plan,
		});
		const config = rendered.artifacts.find(
			(artifact) => artifact.path === ".codex/config.toml",
		)?.content;
		expect(config).toContain(`max_threads = ${maxThreads}`);
		expect(config).toContain(`job_max_runtime_seconds = ${jobRuntime}`);
		expect(config).toContain("multi_agent = false");
		expect(config).toContain("multi_agent_v2 = false");
		expect(config).toContain("enable_fanout = false");
	}
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
