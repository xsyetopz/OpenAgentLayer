import type {
	AdapterArtifact,
	AdapterBundle,
	AdapterContext,
	AdapterRenderResult,
} from "@openagentlayer/adapter-contract";
import { createUnsupportedCapabilityDiagnostic } from "@openagentlayer/adapter-contract";
import type {
	Diagnostic,
	SourceGraph,
	SourceRecord,
} from "@openagentlayer/types";
import {
	compareByPath,
	renderJsonFile,
	validateConfigObject,
} from "../../shared";
import { renderCodexAgentsMd, renderCodexConfig } from "./config";
import {
	CODEX_CONFIG_PATH,
	CODEX_PLUGIN_ROOT,
	CODEX_SURFACE,
} from "./constants";
import { renderCodexRecordArtifacts } from "./records";

export function renderCodexRecord(
	record: SourceRecord,
	_context: AdapterContext,
): AdapterRenderResult {
	if (!record.surfaces.includes(CODEX_SURFACE)) {
		return {
			artifacts: [],
			diagnostics: [
				createUnsupportedCapabilityDiagnostic(CODEX_SURFACE, record),
			],
		};
	}
	return {
		artifacts: renderCodexRecordArtifacts(record),
		diagnostics: [],
	};
}

export function renderCodexBundle(
	graph: SourceGraph,
	context: AdapterContext,
): AdapterBundle {
	const diagnostics: Diagnostic[] = [];
	const artifacts: AdapterArtifact[] = renderCodexBundleArtifacts(graph);
	diagnostics.push(
		...validateConfigObject({
			artifactPath: CODEX_CONFIG_PATH,
			config: Bun.TOML.parse(renderCodexConfig(graph)) as Record<
				string,
				unknown
			>,
			graph,
			surface: CODEX_SURFACE,
		}),
	);

	for (const record of graph.records) {
		if (!record.surfaces.includes(CODEX_SURFACE)) {
			continue;
		}
		artifacts.push(...renderCodexRecordArtifacts(record, graph, context));
	}

	return {
		adapterId: CODEX_SURFACE,
		surface: CODEX_SURFACE,
		artifacts: artifacts.sort(compareByPath),
		diagnostics,
	};
}

function renderCodexBundleArtifacts(graph: SourceGraph): AdapterArtifact[] {
	return [
		{
			surface: CODEX_SURFACE,
			kind: "plugin",
			path: `${CODEX_PLUGIN_ROOT}/.codex-plugin/plugin.json`,
			content: renderJsonFile({
				description:
					"OpenAgentLayer routes, skills, and hook defaults for Codex",
				interface: {
					capabilities: ["Read", "Write", "Bash", "Search"],
					displayName: "OpenAgentLayer",
					shortDescription: "Portable agent behavior layer for Codex",
				},
				name: "openagentlayer",
				skills: "./skills/",
				version: "4.0.0",
			}),
			sourceRecordIds: graph.records.map((record) => record.id).sort(),
		},
		{
			surface: CODEX_SURFACE,
			kind: "config",
			path: CODEX_CONFIG_PATH,
			content: renderCodexConfig(graph),
			installMode: "structured-object",
			sourceRecordIds: graph.records.map((record) => record.id).sort(),
		},
		{
			surface: CODEX_SURFACE,
			kind: "instruction",
			path: "AGENTS.md",
			content: renderCodexAgentsMd(graph),
			installMode: "marked-text-block",
			managedBlockId: "codex-instructions",
			sourceRecordIds: graph.records.map((record) => record.id).sort(),
		},
	];
}
