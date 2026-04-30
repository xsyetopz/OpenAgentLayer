import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeCommand,
	writeSkill,
} from "@openagentlayer/testkit";
import {
	artifactContent,
	artifactPaths,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL OpenCode bundle rendering", () => {
	test("renders native artifacts, plugin, and config", async () => {
		const bundle = await renderSurfaceBundle("opencode");
		const plugin = artifactContent(
			bundle,
			".opencode/plugins/openagentlayer.ts",
		);
		const config = artifactContent(bundle, "opencode.json");

		expect(artifactPaths(bundle)).toEqual(
			expect.arrayContaining([
				".opencode/agents/athena.md",
				".opencode/agents/hephaestus.md",
				".opencode/commands/plan.md",
				".opencode/openagentlayer/guidance/core.md",
				".opencode/openagentlayer/policies/completion-gate.json",
				".opencode/openagentlayer/policies/destructive-command-guard.json",
				".opencode/openagentlayer/policies/prompt-context-injection.json",
				".opencode/openagentlayer/policies/secret-path-guard.json",
				".opencode/openagentlayer/runtime/completion-gate.mjs",
				".opencode/openagentlayer/runtime/destructive-command-guard.mjs",
				".opencode/openagentlayer/runtime/prompt-context-injection.mjs",
				".opencode/plugins/openagentlayer.ts",
				".opencode/skills/review-policy/SKILL.md",
				"opencode.json",
			]),
		);
		expect(bundle.diagnostics).toEqual([]);
		expect(plugin).toContain("destructive-command-guard");
		expect(plugin).toContain("tui.prompt.append");
		expect(plugin).toContain("permission.asked");
		expect(plugin).toContain("secret-path-guard");
		expect(plugin).toContain("OpenAgentLayerPlugin");
		expect(config).toContain('"model": "gpt-5.4"');
		expect(() => JSON.parse(config ?? "")).not.toThrow();
		for (const artifact of bundle.artifacts) {
			expect(artifact.content).not.toContain("openagentsbtw");
		}
	});

	test("renders complete native skill packages from fixture source", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { surfaces: '["opencode"]' });
		await writeSkill(root, {
			invocationMode: "manual-only",
			supportFile: "references/guide.md",
			surfaces: '["opencode"]',
			userInvocable: false,
		});
		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}
		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"opencode",
		);
		const config = artifactContent(bundle, "opencode.json");
		const skill = artifactContent(
			bundle,
			".opencode/skills/fixture-skill/SKILL.md",
		);

		expect(artifactPaths(bundle)).toContain(
			".opencode/skills/fixture-skill/references/guide.md",
		);
		expect(config).toContain('"fixture-skill": "deny"');
		expect(skill).toStartWith("---\n");
		expect(skill).toContain('name: "fixture-skill"');
		expect(skill).toContain('license: "MIT"');
		expect(skill).not.toContain("disable-model-invocation");
		expect(skill).not.toContain("user-invocable");
	});

	test("renders command config and markdown from fixture source", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { surfaces: '["opencode"]' });
		await writeSkill(root, { surfaces: '["opencode"]' });
		await writeCommand(root, {
			requiredSkills: '["fixture-skill"]',
			supportFile: "references/command.md",
			surfaces: '["opencode"]',
		});
		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}
		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"opencode",
		);
		const config = artifactContent(bundle, "opencode.json");
		const command = artifactContent(
			bundle,
			".opencode/commands/fixture-command.md",
		);

		expect(config).toContain('"fixture-command"');
		expect(command).toContain("$ARGUMENTS");
		expect(command).toContain("Required skills: fixture-skill");
		expect(artifactPaths(bundle)).toContain(
			".opencode/commands/fixture-command/references/command.md",
		);
	});
});
