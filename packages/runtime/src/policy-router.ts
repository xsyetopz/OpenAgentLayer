import { evaluateCompletionGate } from "./completion-gate";
import { evaluateContextBudgetGuard } from "./context-budget-guard";
import { evaluateDestructiveCommandGuard } from "./destructive-command-guard";
import { evaluateDiffStateGate } from "./diff-state-gate";
import { evaluatePermissionEscalationGuard } from "./permission-escalation-guard";
import { evaluatePlaceholderPrototypeGuard } from "./placeholder-prototype-guard";
import { evaluatePromptContextInjection } from "./prompt-context-injection";
import {
	evaluateFailureCircuit,
	evaluatePromptGitContext,
	evaluateProtectedBranchConfirm,
	evaluateStagedSecretGuard,
	evaluateSubagentRouteContext,
	evaluateWriteQuality,
} from "./recovered-v3-policies";
import { evaluateRtkEnforcementGuard } from "./rtk-enforcement-guard";
import { evaluateSecretPathGuard } from "./secret-path-guard";
import { evaluateSourceDriftGuard } from "./source-drift-guard";
import { evaluateStaleGeneratedArtifactGuard } from "./stale-generated-artifact-guard";
import type { RuntimeDecision, RuntimePayload } from "./types";

export function evaluateRuntimePolicy(
	payload: RuntimePayload,
): RuntimeDecision {
	switch (payload.policy_id) {
		case "completion-gate":
			return evaluateCompletionGate(payload);
		case "destructive-command-guard":
			return evaluateDestructiveCommandGuard(payload);
		case "prompt-context-injection":
			return evaluatePromptContextInjection(payload);
		case "context-budget-guard":
			return evaluateContextBudgetGuard(payload);
		case "diff-state-gate":
			return evaluateDiffStateGate(payload);
		case "permission-escalation-guard":
			return evaluatePermissionEscalationGuard(payload);
		case "placeholder-prototype-guard":
			return evaluatePlaceholderPrototypeGuard(payload);
		case "rtk-enforcement-guard":
			return evaluateRtkEnforcementGuard(payload);
		case "secret-path-guard":
			return evaluateSecretPathGuard(payload);
		case "stale-generated-artifact-guard":
			return evaluateStaleGeneratedArtifactGuard(payload);
		case "failure-circuit":
			return evaluateFailureCircuit(payload);
		case "prompt-git-context":
			return evaluatePromptGitContext(payload);
		case "protected-branch-confirm":
			return evaluateProtectedBranchConfirm(payload);
		case "staged-secret-guard":
			return evaluateStagedSecretGuard(payload);
		case "subagent-route-context":
			return evaluateSubagentRouteContext(payload);
		case "write-quality":
			return evaluateWriteQuality(payload);
		case "source-drift-guard":
			return {
				decision: "warn",
				policy_id: payload.policy_id,
				message:
					"Source drift guard requires async runtime evaluation; use evaluateRuntimePolicyAsync.",
			};
		default:
			return {
				context: { requested_policy_id: payload.policy_id ?? "missing" },
				decision: "warn",
				policy_id: "unsupported-runtime-policy",
				message: `Unsupported runtime policy id '${payload.policy_id ?? "missing"}'.`,
			};
	}
}

export async function evaluateRuntimePolicyAsync(
	payload: RuntimePayload,
): Promise<RuntimeDecision> {
	if (payload.policy_id === "source-drift-guard") {
		return await evaluateSourceDriftGuard(payload);
	}
	return evaluateRuntimePolicy(payload);
}
