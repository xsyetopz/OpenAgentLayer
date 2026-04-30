import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import {
	artifactInstallMode,
	parsedProviderConfig,
	providerConfigParityResult,
	renderedContents,
} from "../_helpers/provider-parity";
import {
	artifactContent,
	artifactPaths,
	loadFixtureGraph,
} from "../_helpers/registry";

describe("OAL provider parity rendering", () => {
	test("renders schema-allowlisted provider configs without blocked or replacement keys", async () => {
		const graph = await loadFixtureGraph();
		const bundles = createAdapterRegistry().renderAllBundles(graph);

		for (const bundle of bundles) {
			const parity = providerConfigParityResult(graph, bundle);
			expect(bundle.diagnostics).toEqual([]);
			expect(parity.diagnostics).toEqual([]);
			expect(parity.surfaceConfigFound).toBe(true);
			expect(parity.blockedPathsPresent).toEqual([]);
			expect(parity.replacementSourcesPresent).toEqual([]);
		}
	});

	test("renders Codex-native config, agents, plugin skills, hooks, and managed ownership", async () => {
		const graph = await loadFixtureGraph();
		const bundle = createAdapterRegistry().renderSurfaceBundle(graph, "codex");
		const config = parsedProviderConfig(bundle) as {
			readonly features?: Record<string, boolean>;
			readonly hooks?: Record<string, unknown[]>;
			readonly profiles?: Record<string, unknown>;
		};
		const athena = artifactContent(bundle, ".codex/agents/athena.toml");

		expect(artifactPaths(bundle)).toEqual(
			expect.arrayContaining([
				".codex/agents/athena.toml",
				".codex/config.toml",
				".codex/openagentlayer/plugin/.codex-plugin/plugin.json",
				".codex/openagentlayer/plugin/skills/command-plan/SKILL.md",
				".codex/openagentlayer/plugin/skills/review-policy/SKILL.md",
				".codex/openagentlayer/runtime/completion-gate.mjs",
				"AGENTS.md",
			]),
		);
		expect(config.features).toMatchObject({
			fast_mode: false,
			multi_agent: false,
			multi_agent_v2: true,
			unified_exec: false,
		});
		expect(Object.keys(config.hooks ?? {})).toEqual(
			expect.arrayContaining([
				"PermissionRequest",
				"PostToolUse",
				"PreToolUse",
				"Stop",
				"UserPromptSubmit",
			]),
		);
		expect(Object.keys(config.profiles ?? {})).toEqual(
			expect.arrayContaining(["codex-plus", "codex-pro-5", "codex-pro-20"]),
		);
		expect(athena).toContain('developer_instructions = """');
		expect(athena).toContain('model = "gpt-5.4"');
		expect(artifactInstallMode(bundle, ".codex/config.toml")).toBe(
			"structured-object",
		);
		expect(artifactInstallMode(bundle, "AGENTS.md")).toBe("marked-text-block");
		expect(
			artifactInstallMode(
				bundle,
				".codex/openagentlayer/runtime/completion-gate.mjs",
			),
		).toBe("full-file");
	});

	test("renders Claude-native settings, commands, skills, hooks, and claude binary naming", async () => {
		const graph = await loadFixtureGraph();
		const bundle = createAdapterRegistry().renderSurfaceBundle(graph, "claude");
		const settings = parsedProviderConfig(bundle) as {
			readonly hooks?: Record<string, unknown[]>;
		};

		expect(artifactPaths(bundle)).toEqual(
			expect.arrayContaining([
				".claude/agents/athena.md",
				".claude/commands/plan.md",
				".claude/settings.json",
				".claude/skills/review-policy/SKILL.md",
				".claude/openagentlayer/runtime/completion-gate.mjs",
				"CLAUDE.md",
			]),
		);
		expect(Object.keys(settings.hooks ?? {})).toEqual(
			expect.arrayContaining([
				"PermissionRequest",
				"PostToolUse",
				"PreToolUse",
				"Stop",
				"UserPromptSubmit",
			]),
		);
		expect(JSON.stringify(settings.hooks ?? {})).not.toContain("claude-code");
		for (const content of renderedContents(bundle)) {
			expect(content).not.toContain("Claude Code's binary");
		}
		expect(artifactInstallMode(bundle, ".claude/settings.json")).toBe(
			"structured-object",
		);
		expect(artifactInstallMode(bundle, "CLAUDE.md")).toBe("marked-text-block");
		expect(
			artifactInstallMode(
				bundle,
				".claude/openagentlayer/runtime/completion-gate.mjs",
			),
		).toBe("full-file");
	});

	test("renders OpenCode-native config, plugin events, commands, skills, and runtime files", async () => {
		const graph = await loadFixtureGraph();
		const bundle = createAdapterRegistry().renderSurfaceBundle(
			graph,
			"opencode",
		);
		const config = parsedProviderConfig(bundle) as {
			readonly agent?: Record<string, unknown>;
			readonly command?: Record<string, unknown>;
			readonly instructions?: string[];
			readonly plugin?: string[];
		};
		const plugin = artifactContent(
			bundle,
			".opencode/plugins/openagentlayer.ts",
		);

		expect(artifactPaths(bundle)).toEqual(
			expect.arrayContaining([
				".opencode/agents/athena.md",
				".opencode/commands/plan.md",
				".opencode/openagentlayer/instructions.md",
				".opencode/openagentlayer/runtime/completion-gate.mjs",
				".opencode/plugins/openagentlayer.ts",
				".opencode/skills/review-policy/SKILL.md",
				"opencode.json",
			]),
		);
		expect(config.instructions).toEqual([
			".opencode/openagentlayer/instructions.md",
		]);
		expect(config.plugin).toEqual([".opencode/plugins/openagentlayer.ts"]);
		expect(Object.keys(config.agent ?? {})).toContain("athena");
		expect(Object.keys(config.command ?? {})).toContain("plan");
		expect(plugin).toContain("permission.asked");
		expect(plugin).toContain("tool.execute.before");
		expect(plugin).toContain("session.status");
		expect(plugin).toContain("tui.prompt.append");
		expect(artifactInstallMode(bundle, "opencode.json")).toBe(
			"structured-object",
		);
		expect(
			artifactInstallMode(bundle, ".opencode/openagentlayer/instructions.md"),
		).toBe("full-file");
		expect(
			artifactInstallMode(
				bundle,
				".opencode/openagentlayer/runtime/completion-gate.mjs",
			),
		).toBe("full-file");
	});
});
