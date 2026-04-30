import type { RuntimeDecision, RuntimePayload } from "./types";

export function evaluatePromptContextInjection(
	payload: RuntimePayload,
): RuntimeDecision {
	const route = payload.route ?? "default";
	return {
		context: {
			prompt_append: [
				"OpenAgentLayer context:",
				`- Surface: ${payload.surface ?? "unknown"}.`,
				`- Event: ${payload.event ?? "unknown"}.`,
				`- Route: ${route}.`,
				"- Use OAL source graph roles, commands, skills, policies, and validation contracts.",
				"- Preserve tool-native behavior; do not invent harness/framework behavior.",
			].join("\n"),
		},
		decision: "context",
		policy_id: payload.policy_id ?? "prompt-context-injection",
		message: "OAL prompt context available.",
	};
}
