import { extractMetadata } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

export function evaluateStaleGeneratedArtifactGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const metadata = extractMetadata(payload);
	const stalePaths = Array.isArray(metadata["stale_paths"])
		? metadata["stale_paths"].filter(
				(path): path is string => typeof path === "string",
			)
		: [];
	const stale = metadata["generated_stale"] === true || stalePaths.length > 0;
	if (!stale) {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "stale-generated-artifact-guard",
			message: "No stale generated artifacts reported.",
		};
	}
	return {
		context: { stale_paths: stalePaths },
		decision: "deny",
		policy_id: payload.policy_id ?? "stale-generated-artifact-guard",
		message: "Stale generated artifacts blocked.",
	};
}
