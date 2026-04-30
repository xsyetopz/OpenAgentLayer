import type {
	EffortLevel,
	ModelId,
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
	if (plan === undefined) {
		return { model: undefined, effort: undefined, planId: undefined };
	}

	const assignment = plan.role_assignments.find(
		(candidate) => candidate.role === roleId,
	);
	return {
		model: assignment?.model ?? plan.default_model,
		effort: assignment?.effort ?? plan.effort_ceiling,
		planId: plan.id,
	};
}
