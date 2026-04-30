import { extractTextBlobs } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

const PLACEHOLDER_PATTERN =
	/\b(TODO|FIXME|XXX|stub|placeholder|not implemented|coming soon|lorem ipsum|rest follows|similar to above)\b/iu;

export function evaluatePlaceholderPrototypeGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const match = extractTextBlobs(payload).find((blob) =>
		PLACEHOLDER_PATTERN.test(blob),
	);
	if (match !== undefined) {
		return {
			decision: "deny",
			policy_id: payload.policy_id ?? "placeholder-prototype-guard",
			message: "Placeholder or prototype content blocked.",
		};
	}
	return {
		decision: "allow",
		policy_id: payload.policy_id ?? "placeholder-prototype-guard",
		message: "No placeholder or prototype content detected.",
	};
}
