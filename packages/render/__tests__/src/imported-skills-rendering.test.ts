import { describe, expect, test } from "bun:test";
import {
	artifactContent,
	artifactPaths,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL imported skill rendering", () => {
	test("renders Caveman and Taste families as complete native skill packages", async () => {
		const codex = await renderSurfaceBundle("codex");
		const claude = await renderSurfaceBundle("claude");
		const opencode = await renderSurfaceBundle("opencode");

		expect(artifactPaths(codex)).toEqual(
			expect.arrayContaining([
				".codex/openagentlayer/plugin/skills/caveman/SKILL.md",
				".codex/openagentlayer/plugin/skills/taste/SKILL.md",
				".codex/openagentlayer/plugin/skills/caveman-compress/scripts/compress.py",
				".codex/openagentlayer/plugin/skills/taste-stitch/reference/upstream/DESIGN.md",
			]),
		);
		expect(artifactPaths(claude)).toEqual(
			expect.arrayContaining([
				".claude/skills/caveman/SKILL.md",
				".claude/skills/taste/SKILL.md",
				".claude/skills/caveman-compress/scripts/compress.py",
				".claude/skills/taste-stitch/reference/upstream/DESIGN.md",
			]),
		);
		expect(artifactPaths(opencode)).toEqual(
			expect.arrayContaining([
				".opencode/skills/caveman/SKILL.md",
				".opencode/skills/taste/SKILL.md",
				".opencode/skills/caveman-compress/scripts/compress.py",
				".opencode/skills/taste-stitch/reference/upstream/DESIGN.md",
			]),
		);

		for (const bundle of [codex, claude, opencode]) {
			expect(
				artifactPaths(bundle).some((path) => path.includes("full-skill")),
			).toBe(false);
		}
		expect(
			artifactContent(
				codex,
				".codex/openagentlayer/plugin/skills/caveman/SKILL.md",
			),
		).toContain("Respond terse like smart caveman");
		expect(
			artifactContent(
				codex,
				".codex/openagentlayer/plugin/skills/taste/SKILL.md",
			),
		).toContain("High-Agency Frontend Skill");
		expect(
			artifactContent(
				codex,
				".codex/openagentlayer/plugin/skills/taste/SKILL.md",
			),
		).toContain("design-taste-frontend");
	});
});
