import type {
	AdapterArtifact,
	AdapterContext,
} from "@openagentlayer/adapter-contract";
import { renderRuntimeScript } from "@openagentlayer/runtime";
import type {
	CommandRecord,
	SourceGraph,
	SourceRecord,
} from "@openagentlayer/types";
import {
	renderJsonFile,
	renderMarkdownWithFrontmatter,
	resolveModelAssignment,
} from "../../shared";
import { OPENCODE_ARTIFACT_ROOT, OPENCODE_SURFACE } from "./constants";

export function renderOpenCodeRecordArtifacts(
	record: SourceRecord,
	graph?: SourceGraph,
	context?: AdapterContext,
): AdapterArtifact[] {
	switch (record.kind) {
		case "agent":
			return [
				{
					surface: OPENCODE_SURFACE,
					kind: "agent",
					path: `.opencode/agents/${record.id}.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							name: record.id,
						},
						record.prompt_content,
					),
					sourceRecordIds: [record.id],
				},
			];
		case "skill":
			return [
				{
					surface: OPENCODE_SURFACE,
					kind: "skill",
					path: `.opencode/skills/${record.id}/SKILL.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							license: "MIT",
							name: record.id,
						},
						record.body_content,
					),
					sourceRecordIds: [record.id],
				},
			];
		case "command":
			return [renderOpenCodeCommand(record, graph, context)];
		case "policy":
			return [
				{
					surface: OPENCODE_SURFACE,
					kind: "hook",
					path: `${OPENCODE_ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`,
					content: renderRuntimeScript(record.id),
					sourceRecordIds: [record.id],
				},
				{
					surface: OPENCODE_SURFACE,
					kind: "validation-metadata",
					path: `${OPENCODE_ARTIFACT_ROOT}/policies/${record.id}.json`,
					content: renderJsonFile({
						category: record.category,
						event_intent: record.event_intent,
						failure_mode: record.failure_mode,
						handler_class: record.handler_class,
						id: record.id,
						surface: OPENCODE_SURFACE,
						surface_events: record.surface_events,
					}),
					sourceRecordIds: [record.id],
				},
			];
		case "guidance":
			return [
				{
					surface: OPENCODE_SURFACE,
					kind: "instruction",
					path: `${OPENCODE_ARTIFACT_ROOT}/guidance/${record.id}.md`,
					content: record.body_content,
					sourceRecordIds: [record.id],
				},
			];
		default:
			return [];
	}
}

function renderOpenCodeCommand(
	record: CommandRecord,
	graph?: SourceGraph,
	context?: AdapterContext,
): AdapterArtifact {
	const assignment =
		graph === undefined
			? { model: record.model_policy }
			: resolveModelAssignment(
					graph,
					OPENCODE_SURFACE,
					record.owner_role,
					context?.modelPlanId,
				);
	return {
		surface: OPENCODE_SURFACE,
		kind: "command",
		path: `.opencode/commands/${record.id}.md`,
		content: renderMarkdownWithFrontmatter(
			{
				agent: record.owner_role,
				description: record.description,
				model: record.model_policy ?? assignment.model,
				subtask: true,
			},
			record.prompt_template_content,
		),
		sourceRecordIds: [record.id],
	};
}
