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

describe("OAL Claude bundle rendering", () => {
	test("renders native artifacts and settings", async () => {
		const bundle = await renderSurfaceBundle("claude");
		const settings = artifactContent(bundle, ".claude/settings.json");

		expect(artifactPaths(bundle)).toContain(".claude/agents/athena.md");
		expect(artifactPaths(bundle)).toContain(".claude/settings.json");
		expect(settings).toContain(
			"bun .claude/openagentlayer/runtime/completion-gate.mjs",
		);
		expect(settings).toContain("UserPromptSubmit");
		expect(settings).toContain("PermissionRequest");
		expect(settings).toContain("secret-path-guard.mjs");
		expect(() => JSON.parse(settings ?? "")).not.toThrow();
		for (const artifact of bundle.artifacts) {
			expect(artifact.content).not.toContain("openagentsbtw");
		}
	});

	test("renders complete native skill packages from fixture source", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { surfaces: '["claude"]' });
		await writeSkill(root, {
			invocationMode: "manual-only",
			supportFile: "references/guide.md",
			surfaces: '["claude"]',
			userInvocable: false,
		});
		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}
		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"claude",
		);
		const skill = artifactContent(
			bundle,
			".claude/skills/fixture-skill/SKILL.md",
		);

		expect(artifactPaths(bundle)).toContain(
			".claude/skills/fixture-skill/references/guide.md",
		);
		expect(skill).toStartWith("---\n");
		expect(skill).toContain('name: "fixture-skill"');
		expect(skill).toContain("disable-model-invocation: true");
	});

	test("renders slash command from fixture source", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { surfaces: '["claude"]' });
		await writeSkill(root, { surfaces: '["claude"]' });
		await writeCommand(root, {
			requiredSkills: '["fixture-skill"]',
			supportFile: "references/command.md",
			surfaces: '["claude"]',
		});
		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}
		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"claude",
		);
		const command = artifactContent(
			bundle,
			".claude/commands/fixture-command.md",
		);

		expect(command).toContain('argument-hint: "objective"');
		expect(command).toContain("$ARGUMENTS");
		expect(command).toContain("Required skills: fixture-skill");
		expect(artifactPaths(bundle)).toContain(
			".claude/commands/fixture-command/references/command.md",
		);
	});
});
