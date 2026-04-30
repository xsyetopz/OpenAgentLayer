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
import { renderCodexAgentConfig } from "./config";
import {
	CODEX_ARTIFACT_ROOT,
	CODEX_PLUGIN_ROOT,
	CODEX_SURFACE,
} from "./constants";

export function renderCodexRecordArtifacts(
	record: SourceRecord,
	graph?: SourceGraph,
	context?: AdapterContext,
): AdapterArtifact[] {
	switch (record.kind) {
		case "agent": {
			const assignment =
				graph === undefined
					? { effort: undefined, model: undefined }
					: resolveModelAssignment(
							graph,
							CODEX_SURFACE,
							record.id,
							context?.modelPlanId,
						);
			return [
				{
					surface: CODEX_SURFACE,
					kind: "agent",
					path: `.codex/agents/${record.id}.toml`,
					content: renderCodexAgentConfig(record, assignment),
					sourceRecordIds: [record.id],
				},
			];
		}
		case "skill":
			return [
				{
					surface: CODEX_SURFACE,
					kind: "skill",
					path: `${CODEX_PLUGIN_ROOT}/skills/${record.id}/SKILL.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							name: record.id,
							"user-invocable": record.user_invocable,
						},
						record.body_content,
					),
					sourceRecordIds: [record.id],
				},
			];
		case "command":
			return [renderCodexCommandSkill(record, graph, context)];
		case "policy":
			return [
				{
					surface: CODEX_SURFACE,
					kind: "hook",
					path: `${CODEX_ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`,
					content: renderRuntimeScript(record.id),
					sourceRecordIds: [record.id],
				},
				{
					surface: CODEX_SURFACE,
					kind: "validation-metadata",
					path: `${CODEX_ARTIFACT_ROOT}/policies/${record.id}.json`,
					content: renderJsonFile({
						category: record.category,
						event_intent: record.event_intent,
						failure_mode: record.failure_mode,
						handler_class: record.handler_class,
						id: record.id,
						surface: CODEX_SURFACE,
						surface_events: record.surface_events,
					}),
					sourceRecordIds: [record.id],
				},
			];
		case "guidance":
			return [
				{
					surface: CODEX_SURFACE,
					kind: "instruction",
					path: `${CODEX_ARTIFACT_ROOT}/guidance/${record.id}.md`,
					content: record.body_content,
					sourceRecordIds: [record.id],
				},
			];
		default:
			return [];
	}
}

function renderCodexCommandSkill(
	record: CommandRecord,
	graph?: SourceGraph,
	context?: AdapterContext,
): AdapterArtifact {
	const assignment =
		graph === undefined
			? { model: record.model_policy }
			: resolveModelAssignment(
					graph,
					CODEX_SURFACE,
					record.owner_role,
					context?.modelPlanId,
				);
	return {
		surface: CODEX_SURFACE,
		kind: "command",
		path: `${CODEX_PLUGIN_ROOT}/skills/command-${record.id}/SKILL.md`,
		content: renderMarkdownWithFrontmatter(
			{
				description: record.description,
				model: record.model_policy ?? assignment.model,
				name: `command-${record.id}`,
				"user-invocable": true,
			},
			[
				record.prompt_template_content.trimEnd(),
				"",
				`Owner role: ${record.owner_role}.`,
				`Route contract: ${record.route_contract ?? "none"}.`,
				`Arguments: ${record.arguments.join(", ") || "none"}.`,
			].join("\n"),
		),
		sourceRecordIds: [record.id],
	};
}
