import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { loadSource } from "../src";

const repoRoot = resolve(import.meta.dir, "../../..");

test("loadSource loads authored prompt skills", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const caveman = graph.source.skills.find((skill) => skill.id === "caveman");
	const taste = graph.source.skills.find((skill) => skill.id === "taste");
	const impeccable = graph.source.skills.find(
		(skill) => skill.id === "impeccable",
	);
	const designWorker = graph.source.skills.find(
		(skill) => skill.id === "design-worker",
	);
	expect(caveman?.body).toContain("Use compact output");
	expect(taste?.body).toContain("Improve product UI");
	expect(impeccable?.body).toContain("IMPECCABLE_PREFLIGHT");
	expect(impeccable?.supportFiles?.map((file) => file.path)).toContain(
		"reference/brand.md",
	);
	expect(impeccable?.supportFiles?.map((file) => file.path)).toContain(
		"scripts/load-context.mjs",
	);
	expect(designWorker?.body).toContain("Design Worker");
	expect(designWorker?.supportFiles?.map((file) => file.path)).toContain(
		"references/worker.md",
	);
	expect(caveman?.upstream).toBeUndefined();
	expect(taste?.upstream).toBeUndefined();
	expect(impeccable?.upstream?.path).toBe(
		"third_party/impeccable/skill/SKILL.md",
	);
	expect(designWorker?.upstream?.path).toBe(
		"third_party/robertmsale-codex/skills/design-worker/SKILL.md",
	);
	const linear = graph.source.skills.find((skill) => skill.id === "linear");
	expect(linear?.body).toContain("linear_graphql");
	expect(linear?.upstream?.path).toBe(
		"third_party/openai-symphony/.codex/skills/linear/SKILL.md",
	);
	const commit = graph.source.skills.find((skill) => skill.id === "commit");
	expect(commit?.upstream).toBeUndefined();
	expect(commit?.body).toContain("Conventional Commits 1.0.0");
	expect(commit?.body).toContain("Codex <noreply@openai.com>");
	expect(commit?.body).toContain("Claude <noreply@anthropic.com>");
	expect(commit?.body).toContain("OpenCode: use the current agent model");
	const git = graph.source.skills.find((skill) => skill.id === "git");
	expect(git?.body).toContain("not alone in the codebase");
	expect(git?.body).toContain("must not be reverted");
	for (const skillId of ["push", "pull", "land"])
		expect(
			graph.source.skills.find((skill) => skill.id === skillId)?.upstream?.path,
		).toBe(`third_party/openai-symphony/.codex/skills/${skillId}/SKILL.md`);
});

test("loadSource reports provenance for authored records", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	expect(graph.provenance.get("skill:caveman")).toContain(
		"source/skills/caveman.json",
	);
	expect(graph.agentIds.has("hephaestus")).toBe(true);
});
