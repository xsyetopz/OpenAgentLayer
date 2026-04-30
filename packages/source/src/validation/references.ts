import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, SourceGraph } from "@openagentlayer/types";
import { SURFACES } from "@openagentlayer/types/constants";

export function validateGraphReferences(
	graph: SourceGraph,
): readonly Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const agentIds = new Set(graph.agents.map((record) => record.id));
	const skillIds = new Set(graph.skills.map((record) => record.id));
	const policyIds = new Set(graph.policies.map((record) => record.id));

	for (const record of graph.agents) {
		for (const skillId of record.skills) {
			if (!skillIds.has(skillId)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-skill-reference",
						`Agent '${record.id}' references unknown skill '${skillId}'.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}

	for (const record of graph.commands) {
		if (!agentIds.has(record.owner_role)) {
			diagnostics.push(
				errorDiagnostic(
					"unknown-owner-role",
					`Command '${record.id}' references unknown owner role '${record.owner_role}'.`,
					record.location.metadataPath,
				),
			);
		}

		for (const policyId of record.hook_policies) {
			if (!policyIds.has(policyId)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-policy-reference",
						`Command '${record.id}' references unknown policy '${policyId}'.`,
						record.location.metadataPath,
					),
				);
			}
		}

		for (const skillId of record.required_skills) {
			if (!skillIds.has(skillId)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-required-skill",
						`Command '${record.id}' references unknown required skill '${skillId}'.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}

	validateModelPlanReferences(graph, diagnostics, agentIds);
	validateUniqueSurfaceDefaults(graph, diagnostics);
	validateSurfaceConfigPresence(graph, diagnostics);

	return diagnostics;
}

function validateModelPlanReferences(
	graph: SourceGraph,
	diagnostics: Diagnostic[],
	agentIds: ReadonlySet<string>,
): void {
	for (const record of graph.modelPlans) {
		for (const assignment of record.role_assignments) {
			if (!agentIds.has(assignment.role)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-role-assignment",
						`Model plan '${record.id}' references unknown role '${assignment.role}'.`,
						record.location.metadataPath,
					),
				);
			}
		}

		for (const override of record.deep_route_overrides) {
			if (!agentIds.has(override.role)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-role-assignment",
						`Model plan '${record.id}' references unknown override role '${override.role}'.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}
}

function validateUniqueSurfaceDefaults(
	graph: SourceGraph,
	diagnostics: Diagnostic[],
): void {
	for (const surface of SURFACES) {
		const defaultPlans = graph.modelPlans.filter(
			(record) =>
				record.default_plan === true && record.surfaces.includes(surface),
		);
		if (defaultPlans.length > 1) {
			for (const record of defaultPlans) {
				diagnostics.push(
					errorDiagnostic(
						"duplicate-default-model-plan",
						`Surface '${surface}' has multiple default model plans.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}
}

function validateSurfaceConfigPresence(
	graph: SourceGraph,
	diagnostics: Diagnostic[],
): void {
	for (const surface of SURFACES) {
		const surfaceConfigs = graph.surfaceConfigs.filter(
			(record) => record.surface === surface,
		);
		if (surfaceConfigs.length === 0) {
			diagnostics.push(
				errorDiagnostic(
					"missing-surface-config",
					`Missing surface config for '${surface}'.`,
				),
			);
		}
		if (surfaceConfigs.length > 1) {
			for (const record of surfaceConfigs) {
				diagnostics.push(
					errorDiagnostic(
						"duplicate-surface-config",
						`Surface '${surface}' has multiple surface config records.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}
}
