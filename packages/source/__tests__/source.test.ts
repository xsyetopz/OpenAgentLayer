import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadSource } from "../src";

const repoRoot = resolve(import.meta.dir, "../../..");

test("loadSource loads authored prompt skills", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	expect(graph.source.promptContracts?.zenDiscipline).toContain(
		"General Zen discipline",
	);
	expect(graph.source.promptContracts?.zenDiscipline).toContain(
		"Explicit is better than implicit.",
	);
	expect(graph.source.promptContracts?.zenDiscipline).toContain(
		"Special cases aren't special enough to break the rules.",
	);
	expect(graph.source.promptContracts?.zenDiscipline).toContain(
		"Namespaces are one honking great idea -- let's do more of those!",
	);
	const caveman = graph.source.skills.find((skill) => skill.id === "caveman");
	const taste = graph.source.skills.find((skill) => skill.id === "taste");
	const impeccable = graph.source.skills.find(
		(skill) => skill.id === "impeccable",
	);
	const crossPlatformApp = graph.source.skills.find(
		(skill) => skill.id === "cross-platform-app",
	);
	expect(caveman?.body).toContain("Use compact output");
	expect(taste?.body).toContain("Improve product UI");
	expect(impeccable?.body).toContain(
		"Designs and iterates production-grade frontend interfaces",
	);
	expect(impeccable?.supportFiles?.map((file) => file.path)).toContain(
		"reference/brand.md",
	);
	expect(impeccable?.supportFiles?.map((file) => file.path)).toContain(
		"scripts/load-context.mjs",
	);
	expect(crossPlatformApp?.supportFiles?.map((file) => file.path)).toContain(
		"references/stack.md",
	);
	expect(crossPlatformApp?.body).toContain("rigid product stack");
	expect(caveman?.upstream).toBeUndefined();
	expect(taste?.upstream).toBeUndefined();
	expect(impeccable?.upstream?.path).toBe(
		"third_party/impeccable/skill/SKILL.md",
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
	const oal = graph.source.skills.find((skill) => skill.id === "oal");
	expect(oal?.body).toContain("OAL's index skill for AI/LLM use");
	expect(oal?.body).toContain("Codex does not infer them automatically");
	expect(oal?.body).toContain("CSV/batch subagents");
	for (const skillId of ["push", "pull", "land", "linear"])
		expect(graph.source.skills.some((skill) => skill.id === skillId)).toBe(
			false,
		);
});

test("loadSource reports provenance for authored records", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	expect(graph.provenance.get("skill:caveman")).toContain(
		"source/skills/caveman.json",
	);
	expect(graph.agentIds.has("hephaestus")).toBe(true);
});

test("loadSource hydrates agent prompts from the shared template", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const hephaestus = graph.source.agents.find(
		(agent) => agent.id === "hephaestus",
	);
	expect(hephaestus?.prompt).toContain("You are Hephaestus");
	expect(hephaestus?.prompt).toContain(
		"Production implementation, refactoring, and bug fixing",
	);
	const rawHephaestus = await readFile(
		resolve(repoRoot, "source/agents/hephaestus.json"),
		"utf8",
	);
	expect(rawHephaestus).not.toContain('"prompt"');
});
