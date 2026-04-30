import { extractCommand, extractPaths } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

const SECRET_PATH_PATTERN =
	/(^|[\\/])(\.env|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|known_hosts|credentials|secrets?)([\\/.]|$)/iu;
const SAFE_EXAMPLE_PATTERN = /(example|sample|template|fixture|mock)/iu;

export function evaluateSecretPathGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const command = extractCommand(payload);
	const candidates = [command, ...extractPaths(payload)].filter(Boolean);
	const secret = candidates.find(
		(value) =>
			SECRET_PATH_PATTERN.test(value) && !SAFE_EXAMPLE_PATTERN.test(value),
	);
	if (secret !== undefined) {
		return {
			decision: "deny",
			policy_id: payload.policy_id ?? "secret-path-guard",
			message: `Secret path access blocked: ${secret}`,
		};
	}
	return {
		decision: "allow",
		policy_id: payload.policy_id ?? "secret-path-guard",
		message: "No secret path access detected.",
	};
}
