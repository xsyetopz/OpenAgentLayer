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
	disablesImplicitSkillInvocation,
	renderAgentSkillMarkdown,
	renderJsonFile,
	renderMarkdownWithFrontmatter,
	renderSkillSupportArtifacts,
	resolveModelAssignment,
} from "../../shared";
import {
	renderCommandMetadata,
	renderCommandSupportArtifacts,
} from "../../shared/commands";
import { renderPromptLayerBlock } from "../../shared/prompt-layers";
import { CLAUDE_ARTIFACT_ROOT, CLAUDE_SURFACE } from "./constants";

export function renderClaudeRecordArtifacts(
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
							CLAUDE_SURFACE,
							record.id,
							context?.modelPlanId,
						);
			return [
				{
					surface: CLAUDE_SURFACE,
					kind: "agent",
					path: `.claude/agents/${record.id}.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							effort: assignment.effort,
							model: assignment.model,
							name: record.id,
							skills: record.skills,
							tools: record.permissions,
						},
						[
							record.prompt_content.trimEnd(),
							...(graph === undefined
								? []
								: [
										renderPromptLayerBlock(graph, CLAUDE_SURFACE, {
											agent: record,
											routeContract: record.route_contract,
										}),
									]),
						].join("\n\n"),
					),
					sourceRecordIds: [record.id],
				},
			];
		}
		case "skill":
			return [
				{
					surface: CLAUDE_SURFACE,
					kind: "skill",
					path: `.claude/skills/${record.id}/SKILL.md`,
					content: [
						renderAgentSkillMarkdown(record, {
							"allowed-tools": record.tool_grants,
							"disable-model-invocation": disablesImplicitSkillInvocation(
								record,
							)
								? true
								: undefined,
							model: record.model_policy,
							"user-invocable": record.user_invocable,
							when_to_use: record.when_to_use,
						}).trimEnd(),
						...(graph === undefined
							? []
							: [
									renderPromptLayerBlock(graph, CLAUDE_SURFACE, {
										routeContract: record.route_contract,
										skill: record,
									}),
								]),
						"",
					].join("\n\n"),
					sourceRecordIds: [record.id],
				},
				...renderSkillSupportArtifacts(
					record,
					CLAUDE_SURFACE,
					`.claude/skills/${record.id}`,
				),
			];
		case "command":
			return [
				renderClaudeCommandSkill(record, graph, context),
				...renderCommandSupportArtifacts(
					record,
					CLAUDE_SURFACE,
					`.claude/commands/${record.id}`,
				),
			];
		case "policy":
			return [
				{
					surface: CLAUDE_SURFACE,
					kind: "hook",
					path: `${CLAUDE_ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`,
					content: renderRuntimeScript(record.id),
					sourceRecordIds: [record.id],
				},
				{
					surface: CLAUDE_SURFACE,
					kind: "validation-metadata",
					path: `${CLAUDE_ARTIFACT_ROOT}/policies/${record.id}.json`,
					content: renderJsonFile({
						category: record.category,
						event_intent: record.event_intent,
						failure_mode: record.failure_mode,
						handler_class: record.handler_class,
						hook_event_category: record.hook_event_category,
						id: record.id,
						surface: CLAUDE_SURFACE,
						surface_events: record.surface_events,
					}),
					sourceRecordIds: [record.id],
				},
			];
		case "guidance":
			return [
				{
					surface: CLAUDE_SURFACE,
					kind: "instruction",
					path: `${CLAUDE_ARTIFACT_ROOT}/guidance/${record.id}.md`,
					content: record.body_content,
					sourceRecordIds: [record.id],
				},
			];
		default:
			return [];
	}
}

function renderClaudeCommandSkill(
	record: CommandRecord,
	graph?: SourceGraph,
	context?: AdapterContext,
): AdapterArtifact {
	const assignment =
		graph === undefined
			? { model: record.model_policy }
			: resolveModelAssignment(
					graph,
					CLAUDE_SURFACE,
					record.owner_role,
					context?.modelPlanId,
				);
	return {
		surface: CLAUDE_SURFACE,
		kind: "command",
		path: `.claude/commands/${record.id}.md`,
		content: renderMarkdownWithFrontmatter(
			{
				"argument-hint": record.arguments.join(" "),
				"allowed-tools": record.required_skills,
				description: record.description,
				model: record.model_policy ?? assignment.model,
			},
			[
				record.prompt_template_content.trimEnd(),
				renderCommandMetadata(record),
				...(graph === undefined
					? []
					: [
							renderPromptLayerBlock(graph, CLAUDE_SURFACE, {
								command: record,
								routeContract: record.route_contract,
							}),
						]),
			].join("\n"),
		),
		sourceRecordIds: [record.id],
	};
}
