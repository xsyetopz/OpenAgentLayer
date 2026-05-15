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
	const compressProse = graph.source.skills.find(
		(skill) => skill.id === "caveman",
	);
	const polishProduct = graph.source.skills.find(
		(skill) => skill.id === "taste",
	);
	const commandParse = graph.source.skills.find(
		(skill) => skill.id === "analyze-commands",
	);
	const plainLanguage = graph.source.skills.find(
		(skill) => skill.id === "write-plain-language",
	);
	const polishUi = graph.source.skills.find(
		(skill) => skill.id === "impeccable",
	);
	const crossPlatformApp = graph.source.skills.find(
		(skill) => skill.id === "build-cross-platform-app",
	);
	const roadmapTracking = graph.source.skills.find(
		(skill) => skill.id === "track-roadmap",
	);
	expect(compressProse?.body).toContain("Use compact output");
	expect(polishProduct?.body).toContain("Improve product UI");
	expect(commandParse?.title).toBe("Analyze Commands");
	expect(commandParse?.body).toContain(
		"Treat command text as structured input",
	);
	expect(plainLanguage?.title).toBe("Write Plain Language");
	expect(plainLanguage?.body).toContain("Rewrite prose");
	expect(polishUi?.body).toContain(
		"Designs and iterates production-grade frontend interfaces",
	);
	expect(polishUi?.supportFiles?.map((file) => file.path)).toContain(
		"reference/brand.md",
	);
	expect(polishUi?.supportFiles?.map((file) => file.path)).toContain(
		"scripts/load-context.mjs",
	);
	expect(crossPlatformApp?.supportFiles?.map((file) => file.path)).toContain(
		"references/stack.md",
	);
	expect(crossPlatformApp?.body).toContain("rigid product stack");
	expect(roadmapTracking?.title).toBe("Track Roadmap");
	expect(roadmapTracking?.description).toContain("PLAN.md");
	expect(roadmapTracking?.body).toContain("[ ]` for not started");
	expect(roadmapTracking?.body).toContain("[~]` for in progress");
	expect(roadmapTracking?.body).toContain("[x]` for done");
	expect(roadmapTracking?.supportFiles?.map((file) => file.path)).toContain(
		"references/checkbox-status.md",
	);
	expect(compressProse?.upstream).toBeUndefined();
	expect(polishProduct?.upstream).toBeUndefined();
	expect(polishUi?.upstream?.path).toBe(
		"third_party/impeccable/skill/SKILL.md",
	);
	const commit = graph.source.skills.find((skill) => skill.id === "git-commit");
	expect(commit?.upstream).toBeUndefined();
	expect(commit?.body).toContain("Conventional Commits 1.0.0");
	expect(commit?.body).toContain("Codex <noreply@openai.com>");
	expect(commit?.body).toContain("Claude <noreply@anthropic.com>");
	expect(commit?.body).toContain("OpenCode: use the current agent model");
	const git = graph.source.skills.find(
		(skill) => skill.id === "manage-git-workflow",
	);
	expect(git?.body).toContain("not alone in the codebase");
	expect(git?.body).toContain("must not be reverted");
	const oal = graph.source.skills.find((skill) => skill.id === "maintain-oal");
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
		"Production implement, refactoring, and bug fixing",
	);
	const rawHephaestus = await readFile(
		resolve(repoRoot, "source/agents/hephaestus.json"),
		"utf8",
	);
	expect(rawHephaestus).not.toContain('"design-prompts"');
});
