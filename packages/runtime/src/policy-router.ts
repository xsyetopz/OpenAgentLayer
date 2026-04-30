import { evaluateCompletionGate } from "./completion-gate";
import { evaluateContextBudgetGuard } from "./context-budget-guard";
import { evaluateDestructiveCommandGuard } from "./destructive-command-guard";
import { evaluateDiffStateGate } from "./diff-state-gate";
import { evaluatePermissionEscalationGuard } from "./permission-escalation-guard";
import { evaluatePlaceholderPrototypeGuard } from "./placeholder-prototype-guard";
import { evaluatePromptContextInjection } from "./prompt-context-injection";
import { evaluateRtkEnforcementGuard } from "./rtk-enforcement-guard";
import { evaluateSecretPathGuard } from "./secret-path-guard";
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
		default:
			return {
				decision: "warn",
				policy_id: payload.policy_id ?? "unknown-policy",
				message: "Unknown policy id.",
			};
	}
}
