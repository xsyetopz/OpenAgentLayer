import type { RuntimePayload, SyntheticHookPayloadOptions } from "./types";

export function createSyntheticHookPayload(
	options: SyntheticHookPayloadOptions,
): RuntimePayload {
	return {
		event: options.event,
		policy_id: options.policyId,
		surface: options.surface,
		...(options.command === undefined ? {} : { command: options.command }),
		...(options.toolInput === undefined
			? {}
			: { tool_input: options.toolInput }),
		...(options.metadata === undefined ? {} : { metadata: options.metadata }),
	};
}
