import { extractCommand, extractMetadata } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

const SUDO_COMMAND_PATTERN = /\bsudo\b/u;

export function evaluatePermissionEscalationGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const metadata = extractMetadata(payload);
	const justification = metadata["justification"] ?? metadata["reason"];
	const risk = metadata["risk"] ?? metadata["risk_level"];
	const command = extractCommand(payload);
	const escalationRequested =
		payload.event?.toLowerCase().includes("permission") === true ||
		metadata["sandbox_permissions"] === "require_escalated" ||
		SUDO_COMMAND_PATTERN.test(command);
	if (!escalationRequested) {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "permission-escalation-guard",
			message: "No permission escalation requested.",
		};
	}
	if (
		typeof justification === "string" &&
		justification.trim() !== "" &&
		typeof risk === "string"
	) {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "permission-escalation-guard",
			message:
				"Permission escalation request includes justification and risk metadata.",
		};
	}
	return {
		decision: "deny",
		policy_id: payload.policy_id ?? "permission-escalation-guard",
		message:
			"Permission escalation blocked: missing justification or risk metadata.",
	};
}
