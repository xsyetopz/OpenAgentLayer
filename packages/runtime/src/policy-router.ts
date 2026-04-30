import { evaluateCompletionGate } from "./completion-gate";
import { evaluateDestructiveCommandGuard } from "./destructive-command-guard";
import { evaluatePromptContextInjection } from "./prompt-context-injection";
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
		default:
			return {
				decision: "warn",
				policy_id: payload.policy_id ?? "unknown-policy",
				message: "Unknown policy id.",
			};
	}
}
