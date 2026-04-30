import { extractMetadata } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

export function evaluateCompletionGate(
	payload: RuntimePayload,
): RuntimeDecision {
	const metadata = extractMetadata(payload);
	const hasValidationEvidence =
		metadata["validation_passed"] === true ||
		metadata["validation"] === "passed" ||
		metadata["validation"] === "pass";

	if (hasValidationEvidence) {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "completion-gate",
			message: "Completion gate satisfied.",
		};
	}

	return {
		decision: "deny",
		policy_id: payload.policy_id ?? "completion-gate",
		message: "Completion blocked: missing validation evidence.",
	};
}
