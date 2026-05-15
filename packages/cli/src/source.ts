import { resolve } from "node:path";
import { renderAllProviders } from "@openagentlayer/adapter";
import { assertPolicyPass, validateSourceGraph } from "@openagentlayer/policy";
import {
	type CavemanMode,
	loadSource,
	type OalSource,
} from "@openagentlayer/source";
import { option } from "./arguments";

export interface RenderableSourceReport {
	sourceRoot: string;
	providers: string[];
	artifacts: number;
	unsupported: number;
}

export const cavemanModes = [
	"off",
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan",
	"wenyan-ultra",
] as const satisfies readonly CavemanMode[];

export async function loadCheckedSource(repoRoot: string, args: string[] = []) {
	const graph = await loadSource(resolve(repoRoot, "source"));
	assertPolicyPass(validateSourceGraph(graph));
	return applySourceOverrides(graph.source, args);
}

export function applySourceOverrides(
	source: OalSource,
	args: string[],
): OalSource {
	const cavemanMode = option(args, "--caveman-mode");
	if (!cavemanMode) return source;
	if (!isCavemanMode(cavemanMode))
		throw new Error(
			`Unsupported Caveman mode \`${cavemanMode}\`. Expected \`${cavemanModes.join(", ")}\`.`,
		);
	return { ...source, caveman: { mode: cavemanMode } };
}

export function isCavemanMode(mode: string): mode is CavemanMode {
	return (cavemanModes as readonly string[]).includes(mode);
}

export async function assertRenderableSource(repoRoot: string): Promise<void> {
	await renderAllProviders(await loadCheckedSource(repoRoot), repoRoot);
}

export async function renderableSourceReport(
	repoRoot: string,
	args: string[] = [],
): Promise<RenderableSourceReport> {
	const sourceRoot = resolve(repoRoot, "source");
	const source = await loadCheckedSource(repoRoot, args);
	const rendered = await renderAllProviders(source, repoRoot);
	return {
		sourceRoot,
		providers: [
			...new Set(rendered.artifacts.map((artifact) => artifact.provider)),
		],
		artifacts: rendered.artifacts.length,
		unsupported: rendered.unsupported.length,
	};
}
