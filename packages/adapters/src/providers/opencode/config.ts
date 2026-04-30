import type { AdapterContext } from "@openagentlayer/adapter-contract";
import type {
	AgentRecord,
	Diagnostic,
	SourceGraph,
} from "@openagentlayer/types";
import { resolveModelAssignment } from "../../shared";
import { OPENCODE_SURFACE } from "./constants";

export function renderOpenCodeConfig(
	graph: SourceGraph,
	context: AdapterContext,
): Record<string, unknown> {
	const defaultAgent = resolveOpenCodeDefaultAgent(graph);
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
		...(defaultAgent === undefined ? {} : { default_agent: defaultAgent.id }),
		instructions: [".opencode/openagentlayer/instructions.md"],
		permission: {
			...(projectDefaults["permission"] as Record<string, unknown>),
			skill: Object.fromEntries(
				graph.skills.map((record) => [
					record.id,
					record.user_invocable === false ? "deny" : "allow",
				]),
			),
		},
	};
}

export function validateOpenCodeDefaultAgent(
	graph: SourceGraph,
): readonly Diagnostic[] {
	const defaultCandidates = openCodePrimaryAgents(graph);
	if (defaultCandidates.length === 1) {
		return [];
	}
	if (defaultCandidates.length === 0) {
		return [
			{
				code: "missing-opencode-primary-agent",
				level: "error",
				message:
					"OpenCode config requires exactly one source agent with primary = true for default_agent.",
			},
		];
	}
	return [
		{
			code: "multiple-opencode-primary-agents",
			level: "error",
			message: `OpenCode config has multiple primary agents: ${defaultCandidates.map((record) => record.id).join(", ")}.`,
		},
	];
}

function resolveOpenCodeDefaultAgent(
	graph: SourceGraph,
): AgentRecord | undefined {
	const defaultCandidates = openCodePrimaryAgents(graph);
	return defaultCandidates.length === 1 ? defaultCandidates[0] : undefined;
}

function openCodePrimaryAgents(graph: SourceGraph): readonly AgentRecord[] {
	return graph.agents.filter(
		(record) =>
			record.primary === true && record.surfaces.includes(OPENCODE_SURFACE),
	);
}
