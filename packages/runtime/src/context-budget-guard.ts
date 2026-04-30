import { extractBooleanMetadata, extractNumberMetadata } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

const LOW_CONTEXT_TOKEN_THRESHOLD = 4_000;

export function evaluateContextBudgetGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const remaining = extractNumberMetadata(payload, "remaining_context_tokens");
	const compacting =
		extractBooleanMetadata(payload, "compaction") === true ||
		(payload.event ?? "").toLowerCase().includes("compact");
	if (
		!compacting &&
		(remaining === undefined || remaining > LOW_CONTEXT_TOKEN_THRESHOLD)
	) {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "context-budget-guard",
			message: "Context budget is sufficient.",
		};
	}
	return {
		context: {
			prompt_append:
				"Before compaction or low-context continuation, preserve OAL route, changed files, validation state, blockers, and next command.",
		},
		decision: "context",
		policy_id: payload.policy_id ?? "context-budget-guard",
		message: "Context preservation guidance emitted.",
	};
}
