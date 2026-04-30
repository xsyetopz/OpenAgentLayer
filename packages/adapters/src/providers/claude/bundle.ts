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
import {
	CLAUDE_INSTRUCTIONS_PATH,
	CLAUDE_SETTINGS_PATH,
	CLAUDE_SURFACE,
} from "./constants";
import { renderClaudeRecordArtifacts } from "./records";
import { renderClaudeSettings } from "./settings";

export function renderClaudeRecord(
	record: SourceRecord,
	_context: AdapterContext,
): AdapterRenderResult {
	if (!record.surfaces.includes(CLAUDE_SURFACE)) {
		return {
			artifacts: [],
			diagnostics: [
				createUnsupportedCapabilityDiagnostic(CLAUDE_SURFACE, record),
			],
		};
	}
	return {
		artifacts: renderClaudeRecordArtifacts(record),
		diagnostics: [],
	};
}

export function renderClaudeBundle(
	graph: SourceGraph,
	context: AdapterContext,
): AdapterBundle {
	const diagnostics: Diagnostic[] = [];
	const artifacts: AdapterArtifact[] = [
		renderSettingsArtifact(graph),
		renderInstructionsArtifact(graph),
	];
	diagnostics.push(
		...validateModelAssignments(graph, CLAUDE_SURFACE, context.modelPlanId),
		...validateConfigObject({
			artifactPath: CLAUDE_SETTINGS_PATH,
			config: renderClaudeSettings(graph),
			graph,
			surface: CLAUDE_SURFACE,
		}),
	);

	for (const record of graph.records) {
		if (!record.surfaces.includes(CLAUDE_SURFACE)) {
			continue;
		}
		artifacts.push(...renderClaudeRecordArtifacts(record, graph, context));
	}

	return {
		adapterId: CLAUDE_SURFACE,
		surface: CLAUDE_SURFACE,
		artifacts: artifacts.sort(compareByPath),
		diagnostics,
	};
}

function renderInstructionsArtifact(graph: SourceGraph): AdapterArtifact {
	return {
		surface: CLAUDE_SURFACE,
		kind: "instruction",
		path: CLAUDE_INSTRUCTIONS_PATH,
		content: [
			"# OpenAgentLayer Claude Instructions",
			"",
			renderProjectPromptInstructions(graph, CLAUDE_SURFACE),
			"",
		].join("\n"),
		installMode: "marked-text-block",
		managedBlockId: "claude-instructions",
		sourceRecordIds: graph.records.map((record) => record.id).sort(),
	};
}

function renderSettingsArtifact(graph: SourceGraph): AdapterArtifact {
	return {
		surface: CLAUDE_SURFACE,
		kind: "config",
		path: CLAUDE_SETTINGS_PATH,
		content: renderJsonFile(renderClaudeSettings(graph)),
		installMode: "structured-object",
		sourceRecordIds: graph.records.map((record) => record.id).sort(),
	};
}
