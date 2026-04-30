import type {
	Diagnostic,
	EffortLevel,
	ModelId,
	ModelPlanRecord,
	SourceGraph,
	Surface,
} from "@openagentlayer/types";

export interface ResolvedModelAssignment {
	readonly model: ModelId | undefined;
	readonly effort: EffortLevel | undefined;
	readonly planId: string | undefined;
}

export function resolveModelAssignment(
	graph: SourceGraph,
	surface: Surface,
	roleId: string,
	modelPlanId?: string,
): ResolvedModelAssignment {
	const plan = resolveModelPlan(graph, surface, modelPlanId);
	if (plan === undefined) {
		return { model: undefined, effort: undefined, planId: undefined };
	}

	const assignment = plan.role_assignments.find(
		(candidate) => candidate.role === roleId,
	);
	return {
		model: assignment?.model,
		effort: assignment?.effort,
		planId: plan.id,
	};
}

export function validateModelAssignments(
	graph: SourceGraph,
	surface: Surface,
	modelPlanId?: string,
): readonly Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const plan = resolveModelPlan(graph, surface, modelPlanId);
	if (plan === undefined) {
		diagnostics.push({
			code: "missing-model-plan",
			level: "error",
			message:
				modelPlanId === undefined
					? `Missing default model plan for surface '${surface}'.`
					: `Missing selected model plan '${modelPlanId}' for surface '${surface}'.`,
		});
		return diagnostics;
	}

	for (const agent of graph.agents.filter((record) =>
		record.surfaces.includes(surface),
	)) {
		if (
			!plan.role_assignments.some((assignment) => assignment.role === agent.id)
		) {
			diagnostics.push({
				code: "missing-role-model-assignment",
				level: "error",
				message: `Model plan '${plan.id}' has no role assignment for agent '${agent.id}' on surface '${surface}'.`,
				path: agent.location.metadataPath,
			});
		}
	}

	for (const command of graph.commands.filter((record) =>
		record.surfaces.includes(surface),
	)) {
		if (
			command.model_policy === undefined &&
			!plan.role_assignments.some(
				(assignment) => assignment.role === command.owner_role,
			)
		) {
			diagnostics.push({
				code: "missing-command-owner-model-assignment",
				level: "error",
				message: `Model plan '${plan.id}' has no role assignment for command owner '${command.owner_role}' on surface '${surface}'.`,
				path: command.location.metadataPath,
			});
		}
	}

	return diagnostics;
}

function resolveModelPlan(
	graph: SourceGraph,
	surface: Surface,
	modelPlanId?: string,
): ModelPlanRecord | undefined {
	const surfacePlans = graph.modelPlans
		.filter((record) => record.surfaces.includes(surface))
		.sort((left, right) => left.id.localeCompare(right.id));
	const defaultPlan = surfacePlans.find(
		(record) => record.default_plan === true,
	);
	const plan =
		modelPlanId === undefined
			? (defaultPlan ??
				(surfacePlans.length === 1 ? surfacePlans[0] : undefined))
			: surfacePlans.find((record) => record.id === modelPlanId);
	return plan;
}
