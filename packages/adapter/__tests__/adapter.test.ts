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
	] as const) {
		for (const provider of ["codex", "claude", "opencode"] as const) {
			const rendered = await renderProvider(provider, graph.source, repoRoot);
			const artifact = rendered.artifacts.find((candidate) =>
				candidate.path.endsWith(`/${skill}/SKILL.md`),
			);
			expect(artifact?.content).toContain(expected);
			expect(artifact?.content).toContain("## Prompt contract");
		}
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
	}
});

test("Codex default render uses normal shell and hook-based RTK enforcement", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("codex", graph.source, repoRoot);
	const config = rendered.artifacts.find(
		(artifact) => artifact.path === ".codex/config.toml",
	)?.content;
	expect(config).not.toContain("zsh_path");
	expect(config).toContain("shell_zsh_fork = false");
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
});

test("Claude renders every authored hook event with provider event env", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("claude", graph.source, repoRoot);
	const settings = JSON.parse(
		rendered.artifacts.find(
			(artifact) => artifact.path === ".claude/settings.json",
		)?.content ?? "{}",
	) as { hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>> };
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
	expect(surfaceTool).toContain(".opencode/plugins/openagentlayer.ts");
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
