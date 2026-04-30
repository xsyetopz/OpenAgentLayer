import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeSkill,
} from "@openagentlayer/testkit";
import {
	artifactContent,
	artifactPaths,
	loadFixtureGraph,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL Codex bundle rendering", () => {
	test("renders native artifacts", async () => {
		const bundle = await renderSurfaceBundle("codex");

		expect(bundle.surface).toBe("codex");
		expect(artifactPaths(bundle)).toEqual(
			expect.arrayContaining([
				".codex/agents/athena.toml",
				".codex/agents/hephaestus.toml",
				".codex/config.toml",
				".codex/openagentlayer/guidance/core.md",
				".codex/openagentlayer/plugin/.codex-plugin/plugin.json",
				".codex/openagentlayer/plugin/skills/command-plan/SKILL.md",
				".codex/openagentlayer/plugin/skills/review-policy/SKILL.md",
				".codex/openagentlayer/policies/completion-gate.json",
				".codex/openagentlayer/policies/destructive-command-guard.json",
				".codex/openagentlayer/policies/prompt-context-injection.json",
				".codex/openagentlayer/runtime/completion-gate.mjs",
				".codex/openagentlayer/runtime/destructive-command-guard.mjs",
				".codex/openagentlayer/runtime/prompt-context-injection.mjs",
				"AGENTS.md",
			]),
		);
		expect(bundle.diagnostics).toEqual([]);
	});

	test("renders config, plugin, and model-plan variants", async () => {
		const graph = await loadFixtureGraph();
		const registry = createAdapterRegistry();
		const bundle = registry.renderSurfaceBundle(graph, "codex");
		const codexConfig = artifactContent(bundle, ".codex/config.toml");
		const codexPlugin = artifactContent(
			bundle,
			".codex/openagentlayer/plugin/.codex-plugin/plugin.json",
		);
		const codexPlusAthena = artifactContent(
			bundle,
			".codex/agents/athena.toml",
		);
		const codexProAthena = artifactContent(
			registry.renderSurfaceBundle(graph, "codex", {
				modelPlanId: "codex-pro-5",
			}),
			".codex/agents/athena.toml",
		);

		expect(codexConfig).toContain("fast_mode = false");
		expect(codexConfig).toContain("multi_agent = false");
		expect(codexConfig).toContain("multi_agent_v2 = true");
		expect(codexConfig).toContain("unified_exec = false");
		expect(codexConfig).toContain("[agents]");
		expect(codexConfig).toContain("max_threads = 6");
		expect(codexConfig).toContain("max_depth = 1");
		expect(codexConfig).toContain("[profiles.codex-plus]");
		expect(codexConfig).toContain("[profiles.codex-pro-5]");
		expect(codexConfig).toContain("[[hooks.Stop]]");
		expect(codexConfig).toContain("[[hooks.PreToolUse]]");
		expect(codexConfig).toContain("[[hooks.UserPromptSubmit]]");
		expect(codexConfig).toContain(
			'command = "bun .codex/openagentlayer/runtime/completion-gate.mjs"',
		);
		expect(() => Bun.TOML.parse(codexConfig ?? "")).not.toThrow();
		expect(codexPlugin).toContain('"displayName": "OpenAgentLayer"');
		expect(codexPlugin).toContain('"name": "openagentlayer"');
		expect(codexPlugin).not.toContain("openagentsbtw");
		expect(codexPlusAthena).toContain('model = "gpt-5.4"');
		expect(codexPlusAthena).toContain('name = "athena"');
		expect(codexPlusAthena).toContain('developer_instructions = """');
		expect(codexPlusAthena).not.toContain("\\nOAL role");
		expect(() => Bun.TOML.parse(codexPlusAthena ?? "")).not.toThrow();
		expect(codexProAthena).toContain('model = "gpt-5.5"');
		expect(artifactContent(bundle, "AGENTS.md")).toContain(
			"OpenAgentLayer Codex Instructions",
		);
	});

	test("reports unknown model plan diagnostics", async () => {
		const bundle = await renderSurfaceBundle("codex", {
			modelPlanId: "missing-plan",
		});

		expect(bundle.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "unknown-model-plan",
				level: "error",
			}),
		);
	});

	test("renders complete native skill packages from fixture source", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, {
			id: "fixture-skill",
			invocationMode: "manual-only",
			supportFile: "references/guide.md",
			userInvocable: false,
		});
		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}
		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"codex",
		);

		expect(artifactPaths(bundle)).toContain(
			".codex/openagentlayer/plugin/skills/fixture-skill/SKILL.md",
		);
		expect(artifactPaths(bundle)).toContain(
			".codex/openagentlayer/plugin/skills/fixture-skill/references/guide.md",
		);
		expect(artifactPaths(bundle)).toContain(
			".codex/openagentlayer/plugin/skills/fixture-skill/agents/openai.yaml",
		);
		expect(
			artifactContent(
				bundle,
				".codex/openagentlayer/plugin/skills/fixture-skill/SKILL.md",
			),
		).toContain('name: "fixture-skill"');
	});
});
