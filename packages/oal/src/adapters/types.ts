import { type JsonObject, type SourceGraph, withRawSchemaUrl } from "../source";

export type CapabilityStatus =
	| "supported"
	| "unsupported"
	| "manual"
	| "unknown";

export interface CapabilityReport {
	platform: string;
	surfaces: Record<string, CapabilityStatus>;
}

export interface DetectResult {
	platform: string;
	binary: string;
	available: boolean;
	config_root: string;
	project_root: string;
}

export interface DoctorResult {
	ok: boolean;
	platform: string;
	checks: Array<{
		message: string;
		ok: boolean;
		path?: string;
	}>;
}

export interface RenderedPayload {
	content: string;
	path: string;
	sourcePaths: string[];
}

export interface PlatformAdapter {
	capabilities(graph: SourceGraph): CapabilityReport;
	detect(root: string, graph: SourceGraph): DetectResult;
	doctorHooks(root: string, graph: SourceGraph): DoctorResult;
	id: string;
	render(root: string, graph: SourceGraph): RenderedPayload[];
}

export function jsonPayload(
	path: string,
	value: unknown,
	sourcePaths: string[],
): RenderedPayload {
	return {
		content: `${JSON.stringify(withRawSchemaUrl(value), null, "\t")}\n`,
		path,
		sourcePaths,
	};
}

export function statusMap(
	surfaces: string[],
): Record<string, CapabilityStatus> {
	const map: Record<string, CapabilityStatus> = {};
	for (const surface of surfaces) {
		map[surface] = "supported";
	}
	return map;
}

export function asJsonObject(value: unknown): JsonObject {
	return value as JsonObject;
}
