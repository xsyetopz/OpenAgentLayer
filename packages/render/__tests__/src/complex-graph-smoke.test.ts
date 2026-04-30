import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeCommand,
	writePolicy,
	writeSkill,
} from "@openagentlayer/testkit";
import { artifactPaths } from "../_helpers/registry";

describe("OAL complex graph smoke rendering", () => {
	test("renders agents, commands, skills, policies, hooks, and support files on every provider", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, {
			commands: '["fixture-command"]',
			policies: '["completion-gate"]',
			surfaces: '["codex", "claude", "opencode"]',
		});
		await writeSkill(root, {
			supportFile: "references/guide.md",
			surfaces: '["codex", "claude", "opencode"]',
		});
		await writeCommand(root, {
			hookPolicies: '["completion-gate"]',
			requiredSkills: '["fixture-skill"]',
			supportFile: "references/command.md",
			surfaces: '["codex", "claude", "opencode"]',
		});
		await writePolicy(root, {
			id: "completion-gate",
			surfaceEvents: '["Stop", "session.status"]',
			surfaceMappings:
				'{ codex = "Stop", claude = "Stop", opencode = "session.status" }',
			surfaces: '["codex", "claude", "opencode"]',
		});
		const sourceResult = await loadSourceGraph(root);
		if (sourceResult.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}

		const registry = createAdapterRegistry();
		const codexPaths = artifactPaths(
			registry.renderSurfaceBundle(sourceResult.graph, "codex"),
		);
		const claudePaths = artifactPaths(
			registry.renderSurfaceBundle(sourceResult.graph, "claude"),
		);
		const opencodePaths = artifactPaths(
			registry.renderSurfaceBundle(sourceResult.graph, "opencode"),
		);

		expect(codexPaths).toEqual(
			expect.arrayContaining([
				".codex/agents/fixture-agent.toml",
				".codex/openagentlayer/plugin/skills/command-fixture-command/SKILL.md",
				".codex/openagentlayer/plugin/skills/command-fixture-command/references/command.md",
				".codex/openagentlayer/plugin/skills/fixture-skill/references/guide.md",
				".codex/openagentlayer/runtime/completion-gate.mjs",
			]),
		);
		expect(claudePaths).toEqual(
			expect.arrayContaining([
				".claude/agents/fixture-agent.md",
				".claude/commands/fixture-command.md",
				".claude/commands/fixture-command/references/command.md",
				".claude/skills/fixture-skill/references/guide.md",
				".claude/openagentlayer/runtime/completion-gate.mjs",
			]),
		);
		expect(opencodePaths).toEqual(
			expect.arrayContaining([
				".opencode/agents/fixture-agent.md",
				".opencode/commands/fixture-command.md",
				".opencode/commands/fixture-command/references/command.md",
				".opencode/skills/fixture-skill/references/guide.md",
				".opencode/openagentlayer/runtime/completion-gate.mjs",
			]),
		);
	});
});
