import { extractCommand } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

const RTK_REQUIRED_COMMAND_PATTERN =
	/^(git|bun|bunx|rg|cat|node|python3|env|make|cargo|dotnet|go|swift)(\s|$)/u;

export function evaluateRtkEnforcementGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const command = extractCommand(payload).trim();
	if (command === "" || command.startsWith("rtk ")) {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "rtk-enforcement-guard",
			message: "RTK command policy satisfied.",
		};
	}
	if (RTK_REQUIRED_COMMAND_PATTERN.test(command)) {
		return {
			decision: "deny",
			policy_id: payload.policy_id ?? "rtk-enforcement-guard",
			message: `Command must use RTK wrapper: ${command}`,
		};
	}
	return {
		decision: "allow",
		policy_id: payload.policy_id ?? "rtk-enforcement-guard",
		message: "Command outside RTK managed set.",
	};
}
