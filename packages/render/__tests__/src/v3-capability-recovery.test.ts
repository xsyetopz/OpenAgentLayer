import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadFixtureGraph } from "../_helpers/registry";

describe("OAL v3 capability recovery", () => {
	test("restores broad command and skill surface coverage", async () => {
		const graph = await loadFixtureGraph();
		const registry = createAdapterRegistry();
		const commandIds = graph.commands.map((record) => record.id);
		const skillIds = graph.skills.map((record) => record.id);

		expect(commandIds).toEqual(
			expect.arrayContaining([
				"implement",
				"oal-debug",
				"oal-explore",
				"oal-review",
				"oal-test",
				"oal-trace",
				"orchestrate",
				"validate",
			]),
		);
		expect(skillIds).toEqual(
			expect.arrayContaining([
				"debug",
				"decide",
				"document",
				"explore",
				"openagentsbtw",
				"review",
				"test",
				"trace",
			]),
		);

		for (const surface of ["codex", "claude", "opencode"] as const) {
			const paths = registry
				.renderSurfaceBundle(graph, surface)
				.artifacts.map((artifact) => artifact.path);
			expect(paths).toEqual(
				expect.arrayContaining([
					surface === "codex"
						? ".codex/openagentlayer/plugin/skills/command-implement/SKILL.md"
						: surface === "claude"
							? ".claude/commands/implement.md"
							: ".opencode/commands/implement.md",
					surface === "codex"
						? ".codex/openagentlayer/plugin/skills/debug/SKILL.md"
						: surface === "claude"
							? ".claude/skills/debug/SKILL.md"
							: ".opencode/skills/debug/SKILL.md",
				]),
			);
		}
	});
});
