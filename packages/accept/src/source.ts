import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateSourceGraph } from "@openagentlayer/policy";
import { runtimeHooks } from "@openagentlayer/runtime";
import type { OalSource } from "@openagentlayer/source";

const LIVE_TEXT_PATH_PATTERN =
	/\.(cjs|js|json|jsonc|md|mjs|ts|tsx|toml|yaml|yml)$/;
const LINE_PATTERN = /\r?\n/;
const MARKDOWN_SEMICOLON_BULLET_PATTERN = /^\s*-\s.+;$/;
const BARE_MARKDOWN_URL_PATTERN = /(^|[\s(])https?:\/\/[^\s)<>]+/;

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
	for (const directory of [
		"agents",
		"skills",
		"routes",
		"hooks",
		"tools",
		"prompts",
	]) {
		const entries = await readdir(join(repoRoot, "source", directory));
		if (
			!entries.some((entry) => entry.endsWith(".json") || entry.endsWith(".md"))
		)
			throw new Error(`No authored source records in ${directory}.`);
	}
}

export async function assertNoLegacyCommandAlias(
	repoRoot: string,
): Promise<void> {
	const legacyAlias = ["c", "c", "a"].join("");
	const legacyPattern = new RegExp(
		`/${legacyAlias}:|\\\\b${legacyAlias}\\\\b|${legacyAlias}-`,
		"i",
	);
	for (const path of await liveTextPaths(repoRoot)) {
		const content = await readFile(join(repoRoot, path), "utf8");
		if (legacyPattern.test(content))
			throw new Error(
				`Live OAL surface contains legacy command alias: ${path}`,
			);
	}
}

export async function assertAuthoredMarkdownStyle(
	repoRoot: string,
): Promise<void> {
	const markdownPaths = (await liveTextPaths(repoRoot)).filter((path) =>
		path.endsWith(".md"),
	);
	for (const path of markdownPaths) {
		const content = await readFile(join(repoRoot, path), "utf8");
		assertMarkdownHasHeading(path, content);
		assertMarkdownBulletPunctuation(path, content);
		assertMarkdownLinks(path, content);
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
		"design",
		"document",
		"orchestrate",
		"audit",
	])
		if (!source.routes.some((route) => route.id === id))
			throw new Error(`Missing route ${id}.`);
	for (const id of ["elevate", "delete", "parse"])
		if (!source.skills.some((skill) => skill.id === id))
			throw new Error(`Missing runtime safety skill ${id}.`);
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
			claude: ["claude", "opus", "4", "7"].join("-"),
		},
	};
	const shallow = structuredClone(source);
	shallow.routes[0] = { ...firstRoute, body: "Output: done." };
	if (!source.promptContracts)
		throw new Error("Negative fixtures require product prompt contracts.");
	const noSourceBehavior = structuredClone(source);
	noSourceBehavior.promptContracts = {
		...source.promptContracts,
		sourceBackedBehavior: "Evidence matters.",
	};
	for (const [name, candidate] of [
		["bad codex model", badCodex],
		["bad claude model", badClaude],
		["shallow route", shallow],
		["missing source-backed behavior", noSourceBehavior],
	] as const) {
		const report = validateCandidate(candidate);
		if (!report.issues.some((issue) => issue.severity === "error"))
			throw new Error(`Negative policy fixture did not fail: ${name}`);
	}
}

async function liveTextPaths(repoRoot: string): Promise<string[]> {
	const roots = [
		".github",
		"docs",
		"packages",
		"plugins",
		"source",
		"tests",
	] as const;
	const paths = ["CHANGELOG.md", "CONTRIBUTING.md", "README.md"];
	for (const root of roots)
		paths.push(...(await collectTextPaths(repoRoot, root)));
	return paths;
}

function assertMarkdownHasHeading(path: string, content: string): void {
	const first = content
		.split(LINE_PATTERN)
		.find((line) => line.trim().length > 0)
		?.trim();
	if (!first?.startsWith("#"))
		throw new Error(`Authored Markdown must start with a heading: ${path}`);
}

function assertMarkdownBulletPunctuation(path: string, content: string): void {
	const lines = content.split(LINE_PATTERN);
	for (const [index, line] of lines.entries())
		if (MARKDOWN_SEMICOLON_BULLET_PATTERN.test(line.trim()))
			throw new Error(
				`Authored Markdown bullet ends with semicolon: ${path}:${index + 1}`,
			);
}

function assertMarkdownLinks(path: string, content: string): void {
	let inFence = false;
	for (const [index, line] of content.split(LINE_PATTERN).entries()) {
		if (line.trim().startsWith("```")) {
			inFence = !inFence;
			continue;
		}
		if (
			inFence ||
			line.includes("](") ||
			line.includes("href=") ||
			line.includes("src=") ||
			line.includes("srcset=")
		)
			continue;
		if (BARE_MARKDOWN_URL_PATTERN.test(line))
			throw new Error(
				`Authored Markdown uses a bare URL; add descriptive link text: ${path}:${index + 1}`,
			);
	}
}

async function collectTextPaths(
	repoRoot: string,
	relativeDirectory: string,
): Promise<string[]> {
	const entries = await readdir(join(repoRoot, relativeDirectory), {
		withFileTypes: true,
	});
	const paths: string[] = [];
	for (const entry of entries) {
		const relativePath = `${relativeDirectory}/${entry.name}`;
		if (entry.isDirectory()) {
			if (["node_modules", ".git", ".oal"].includes(entry.name)) continue;
			paths.push(...(await collectTextPaths(repoRoot, relativePath)));
		} else if (isLiveTextPath(relativePath)) {
			paths.push(relativePath);
		}
	}
	return paths;
}

function isLiveTextPath(path: string): boolean {
	return LIVE_TEXT_PATH_PATTERN.test(path);
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
