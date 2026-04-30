import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeCommand,
	writeSkill,
} from "@openagentlayer/testkit";
import { artifactContent, artifactPaths } from "../_helpers/registry";

describe("OAL Codex command bundle rendering", () => {
	test("renders rich command package from fixture source", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		await writeCommand(root, {
			requiredSkills: '["fixture-skill"]',
			supportFile: "references/command.md",
		});

		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}

		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"codex",
		);
		const command = artifactContent(
			bundle,
			".codex/openagentlayer/plugin/skills/command-fixture-command/SKILL.md",
		);

		expect(command).toContain("$ARGUMENTS");
		expect(command).toContain("Required skills: fixture-skill");
		expect(command).toContain('"objective":"string"');
		expect(artifactPaths(bundle)).toContain(
			".codex/openagentlayer/plugin/skills/command-fixture-command/references/command.md",
		);
	});
});
