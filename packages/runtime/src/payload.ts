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

export function extractPaths(payload: RuntimePayload): readonly string[] {
	const direct = payload.paths ?? [];
	const metadata = extractMetadata(payload);
	const metadataPaths = Array.isArray(metadata["paths"])
		? metadata["paths"]
		: Array.isArray(metadata["changed_paths"])
			? metadata["changed_paths"]
			: [];
	const toolInput = payload.tool_input;
	const toolPaths: unknown[] = [];
	if (typeof toolInput === "object" && toolInput !== null) {
		const candidate = toolInput as Record<string, unknown>;
		for (const key of ["path", "file_path", "filePath", "paths"]) {
			const value = candidate[key];
			if (typeof value === "string") {
				toolPaths.push(value);
			}
			if (Array.isArray(value)) {
				toolPaths.push(...value);
			}
		}
	}
	return [...direct, ...metadataPaths, ...toolPaths].filter(
		(path): path is string => typeof path === "string" && path.length > 0,
	);
}

export function extractTextBlobs(payload: RuntimePayload): readonly string[] {
	const metadata = extractMetadata(payload);
	const blobs: unknown[] = [
		metadata["content"],
		metadata["diff"],
		metadata["text"],
	];
	const toolInput = payload.tool_input;
	if (typeof toolInput === "object" && toolInput !== null) {
		const candidate = toolInput as Record<string, unknown>;
		blobs.push(candidate["content"], candidate["diff"], candidate["text"]);
	}
	return blobs.filter(
		(blob): blob is string => typeof blob === "string" && blob.length > 0,
	);
}

export function extractBooleanMetadata(
	payload: RuntimePayload,
	key: string,
): boolean | undefined {
	const value = extractMetadata(payload)[key];
	return typeof value === "boolean" ? value : undefined;
}

export function extractNumberMetadata(
	payload: RuntimePayload,
	key: string,
): number | undefined {
	const value = extractMetadata(payload)[key];
	return typeof value === "number" ? value : undefined;
}
