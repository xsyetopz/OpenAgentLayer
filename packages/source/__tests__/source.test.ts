import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { loadSource } from "../src";

const repoRoot = resolve(import.meta.dir, "../../..");

test("loadSource loads authored prompt skills", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const caveman = graph.source.skills.find((skill) => skill.id === "caveman");
	const taste = graph.source.skills.find((skill) => skill.id === "taste");
	expect(caveman?.body).toContain("Use compact output");
	expect(taste?.body).toContain("Improve product UI");
	expect(caveman?.upstream).toBeUndefined();
	expect(taste?.upstream).toBeUndefined();
});

test("loadSource reports provenance for authored records", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	expect(graph.provenance.get("skill:caveman")).toContain(
		"source/skills/caveman.json",
	);
	expect(graph.agentIds.has("hephaestus")).toBe(true);
});
