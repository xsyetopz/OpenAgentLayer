import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { validateSourceGraph } from "@openagentlayer/policy";
import { runtimeHooks } from "@openagentlayer/runtime";
import type { OalSource } from "@openagentlayer/source";

export function assertHookScriptsAreRuntimeOwned(source: OalSource): void {
	for (const hook of source.hooks) {
		if (!hook.script.endsWith(".mjs"))
			throw new Error(
				`Hook ${hook.id} does not reference .mjs runtime script.`,
			);
		if (!runtimeHooks.includes(hook.script))
			throw new Error(
				`Hook ${hook.id} references unmanaged runtime script ${hook.script}.`,
			);
	}
}

export async function assertSourceInventory(repoRoot: string): Promise<void> {
	for (const directory of ["agents", "skills", "routes", "hooks", "tools"]) {
		const entries = await readdir(join(repoRoot, "source", directory));
		if (!entries.some((entry) => entry.endsWith(".json")))
			throw new Error(`No authored source records in ${directory}.`);
	}
}

export function assertRoadmapSource(source: OalSource): void {
	for (const id of [
		"athena",
		"hermes",
		"hephaestus",
		"atalanta",
		"nemesis",
		"calliope",
		"odysseus",
	])
		if (!source.agents.some((agent) => agent.id === id))
			throw new Error(`Missing core agent ${id}.`);
	for (const id of [
		"plan",
		"implement",
		"review",
		"test",
		"validate",
		"explore",
		"trace",
		"debug",
		"document",
		"orchestrate",
		"audit",
	])
		if (!source.routes.some((route) => route.id === id))
			throw new Error(`Missing route ${id}.`);
}

export function assertNegativePolicyFixtures(source: OalSource): void {
	const firstAgent = source.agents[0];
	const firstRoute = source.routes[0];
	if (!(firstAgent && firstRoute))
		throw new Error("Negative fixtures require at least one agent and route.");
	const badCodex = structuredClone(source);
	badCodex.agents[0] = {
		...firstAgent,
		models: { ...firstAgent.models, codex: ["gpt", "5", "4"].join("-") },
	};
	const badClaude = structuredClone(source);
	badClaude.agents[0] = {
		...firstAgent,
		models: {
			...firstAgent.models,
			claude: ["claude", "opus", "4", "6"].join("-"),
		},
	};
	const shallow = structuredClone(source);
	shallow.routes[0] = { ...firstRoute, body: "Output: done." };
	for (const [name, candidate] of [
		["bad codex model", badCodex],
		["bad claude model", badClaude],
		["shallow route", shallow],
	] as const) {
		const report = validateCandidate(candidate);
		if (!report.issues.some((issue) => issue.severity === "error"))
			throw new Error(`Negative policy fixture did not fail: ${name}`);
	}
}

function validateCandidate(
	source: OalSource,
): import("@openagentlayer/policy").PolicyReport {
	return validateSourceGraph({
		source,
		sourcePath: "negative-fixture",
		agentIds: new Set(source.agents.map((agent) => agent.id)),
		skillIds: new Set(source.skills.map((skill) => skill.id)),
		routeIds: new Set(source.routes.map((route) => route.id)),
		hookIds: new Set(source.hooks.map((hook) => hook.id)),
		toolIds: new Set(source.tools.map((tool) => tool.id)),
		provenance: new Map(),
	});
}
