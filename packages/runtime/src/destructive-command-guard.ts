import { extractCommand } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

const DESTRUCTIVE_COMMAND_PATTERNS: readonly RegExp[] = [
	/\brm\s+-rf\b/u,
	/\brm\s+-fr\b/u,
	/\bgit\s+reset\s+--hard\b/u,
	/\bgit\s+clean\s+-fd\b/u,
	/\bsudo\s+rm\b/u,
	/\bchmod\s+-R\s+777\b/u,
	/>\s*\/dev\/(disk|rdisk)/u,
];

export function evaluateDestructiveCommandGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const command = extractCommand(payload);
	if (command === "") {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "destructive-command-guard",
			message: "No shell command detected.",
		};
	}

	for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
		if (pattern.test(command)) {
			return {
				decision: "deny",
				policy_id: payload.policy_id ?? "destructive-command-guard",
				message: `Command blocked by destructive-command guard: ${command}`,
			};
		}
	}

	return {
		decision: "allow",
		policy_id: payload.policy_id ?? "destructive-command-guard",
		message: "Command allowed.",
	};
}
