import type { AdapterContext } from "@openagentlayer/adapter-contract";
import type { SourceGraph } from "@openagentlayer/types";
import { resolveModelAssignment } from "../../shared";
import { OPENCODE_SURFACE } from "./constants";

export function renderOpenCodeConfig(
	graph: SourceGraph,
	context: AdapterContext,
): Record<string, unknown> {
	const primaryAgent = graph.agents[0]?.id ?? "athena";
	const projectDefaults =
		graph.surfaceConfigs.find((record) => record.surface === OPENCODE_SURFACE)
			?.project_defaults ?? {};
	return {
		...projectDefaults,
		agent: Object.fromEntries(
			graph.agents.map((record) => [
				record.id,
				{
					description: record.description,
					model: resolveModelAssignment(
						graph,
						OPENCODE_SURFACE,
						record.id,
						context.modelPlanId,
					).model,
				},
			]),
		),
		command: Object.fromEntries(
			graph.commands.map((record) => [
				record.id,
				{
					agent: record.owner_role,
					description: record.description,
					model:
						record.model_policy ??
						resolveModelAssignment(
							graph,
							OPENCODE_SURFACE,
							record.owner_role,
							context.modelPlanId,
						).model,
					subtask: true,
					template: record.prompt_template_content.trim(),
				},
			]),
		),
		default_agent: primaryAgent,
		permission: {
			...(projectDefaults["permission"] as Record<string, unknown>),
			skill: Object.fromEntries(
				graph.skills.map((record) => [record.id, "allow"]),
			),
		},
	};
}
