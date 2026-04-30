import {
	extractBooleanMetadata,
	extractMetadata,
	extractNumberMetadata,
} from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

export function evaluateDiffStateGate(
	payload: RuntimePayload,
): RuntimeDecision {
	const metadata = extractMetadata(payload);
	const dirty =
		extractBooleanMetadata(payload, "dirty") === true ||
		(extractNumberMetadata(payload, "files_changed") ?? 0) > 0 ||
		(Array.isArray(metadata["changed_paths"]) &&
			metadata["changed_paths"].length > 0);
	if (!dirty) {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "diff-state-gate",
			message: "No dirty diff state reported.",
		};
	}
	return {
		context: { dirty: true },
		decision: extractBooleanMetadata(payload, "require_clean_tree")
			? "deny"
			: "warn",
		policy_id: payload.policy_id ?? "diff-state-gate",
		message: "Dirty diff state reported.",
	};
}
