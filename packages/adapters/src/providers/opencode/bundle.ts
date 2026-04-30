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
	validateModelAssignments,
} from "../../shared";
import { renderProjectPromptInstructions } from "../../shared/prompt-layers";
import { renderOpenCodeConfig, validateOpenCodeDefaultAgent } from "./config";
import {
	OPENCODE_CONFIG_PATH,
	OPENCODE_INSTRUCTIONS_PATH,
	OPENCODE_PLUGIN_PATH,
	OPENCODE_SURFACE,
} from "./constants";
import { renderOpenCodePlugin } from "./plugin";
import { renderOpenCodeRecordArtifacts } from "./records";

export function renderOpenCodeRecord(
	record: SourceRecord,
	_context: AdapterContext,
): AdapterRenderResult {
	if (!record.surfaces.includes(OPENCODE_SURFACE)) {
		return {
			artifacts: [],
			diagnostics: [
				createUnsupportedCapabilityDiagnostic(OPENCODE_SURFACE, record),
			],
		};
	}
	return {
		artifacts: renderOpenCodeRecordArtifacts(record),
		diagnostics: [],
	};
}

export function renderOpenCodeBundle(
	graph: SourceGraph,
	context: AdapterContext,
): AdapterBundle {
	const diagnostics: Diagnostic[] = [];
	const artifacts: AdapterArtifact[] = renderOpenCodeBundleArtifacts(
		graph,
		context,
	);
	diagnostics.push(
		...validateModelAssignments(graph, OPENCODE_SURFACE, context.modelPlanId),
		...validateOpenCodeDefaultAgent(graph),
		...validateConfigObject({
			artifactPath: OPENCODE_CONFIG_PATH,
			config: renderOpenCodeConfig(graph, context),
			graph,
			surface: OPENCODE_SURFACE,
		}),
	);

	for (const record of graph.records) {
		if (!record.surfaces.includes(OPENCODE_SURFACE)) {
			continue;
		}
		artifacts.push(...renderOpenCodeRecordArtifacts(record, graph, context));
	}

	return {
		adapterId: OPENCODE_SURFACE,
		surface: OPENCODE_SURFACE,
		artifacts: artifacts.sort(compareByPath),
		diagnostics,
	};
}

function renderOpenCodeBundleArtifacts(
	graph: SourceGraph,
	context: AdapterContext,
): AdapterArtifact[] {
	return [
		{
			surface: OPENCODE_SURFACE,
			kind: "config",
			path: OPENCODE_CONFIG_PATH,
			content: renderJsonFile(renderOpenCodeConfig(graph, context)),
			installMode: "structured-object",
			sourceRecordIds: graph.records.map((record) => record.id).sort(),
		},
		{
			surface: OPENCODE_SURFACE,
			kind: "instruction",
			path: OPENCODE_INSTRUCTIONS_PATH,
			content: [
				"# OpenAgentLayer OpenCode Instructions",
				"",
				renderProjectPromptInstructions(graph, OPENCODE_SURFACE),
				"",
			].join("\n"),
			sourceRecordIds: graph.records.map((record) => record.id).sort(),
		},
		{
			surface: OPENCODE_SURFACE,
			kind: "plugin",
			path: OPENCODE_PLUGIN_PATH,
			content: renderOpenCodePlugin(graph.policies),
			sourceRecordIds: graph.policies.map((record) => record.id).sort(),
		},
	];
}
