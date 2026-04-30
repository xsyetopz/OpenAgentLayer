import type { RuntimePayload } from "./types";

export function extractCommand(payload: RuntimePayload): string {
	if (typeof payload.command === "string") {
		return payload.command;
	}

	const toolInput = payload.tool_input;
	if (typeof toolInput === "object" && toolInput !== null) {
		const candidate = toolInput as Record<string, unknown>;
		if (typeof candidate["command"] === "string") {
			return candidate["command"];
		}
		if (typeof candidate["cmd"] === "string") {
			return candidate["cmd"];
		}
	}

	return "";
}

export function extractMetadata(
	payload: RuntimePayload,
): Record<string, unknown> {
	if (payload.metadata !== undefined) {
		return payload.metadata;
	}

	const toolInput = payload.tool_input;
	if (typeof toolInput === "object" && toolInput !== null) {
		const candidate = toolInput as Record<string, unknown>;
		if (
			typeof candidate["metadata"] === "object" &&
			candidate["metadata"] !== null
		) {
			return candidate["metadata"] as Record<string, unknown>;
		}
	}

	return {};
}

export function extractStringMetadata(
	payload: RuntimePayload,
	key: string,
): string | undefined {
	const value = extractMetadata(payload)[key];
	return typeof value === "string" ? value : undefined;
}
