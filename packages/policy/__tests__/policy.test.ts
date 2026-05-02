import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { loadSource } from "@openagentlayer/source";
import { validateSourceGraph } from "../src";

const repoRoot = resolve(import.meta.dir, "../../..");

test("policy rejects forbidden Codex models", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const candidate = structuredClone(graph);
	const firstAgent = candidate.source.agents[0];
	if (!firstAgent) throw new Error("Source has no agents.");
	for (const model of [
		["gpt", "5", "2"].join("-"),
		`${["gpt", "5", "3", "codex"].join("-")}-spark`,
	]) {
		firstAgent.models.codex = model;
		const report = validateSourceGraph(candidate);
		expect(
			report.issues.some((issue) => issue.code === "model-allowlist"),
		).toBe(true);
	}
});

test("policy rejects stale Claude Opus models", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const candidate = structuredClone(graph);
	const firstAgent = candidate.source.agents[0];
	if (!firstAgent) throw new Error("Source has no agents.");
	for (const model of [
		["claude", "opus", "4", "7"].join("-"),
		`${["claude", "opus", "4", "7"].join("-")}[1m]`,
	]) {
		firstAgent.models.claude = model;
		const report = validateSourceGraph(candidate);
		expect(
			report.issues.some((issue) => issue.code === "model-allowlist"),
		).toBe(true);
	}
});

test("policy accepts loaded OAL source", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	expect(validateSourceGraph(graph).issues).toEqual([]);
});
