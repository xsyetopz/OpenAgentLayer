import type {
	Diagnostic,
	SourceGraph,
	Surface,
	SurfaceConfigRecord,
	UnknownMap,
} from "@openagentlayer/types";

export interface ConfigValidationInput {
	readonly graph: SourceGraph;
	readonly surface: Surface;
	readonly config: UnknownMap;
	readonly artifactPath: string;
}

export function getSurfaceConfig(
	graph: SourceGraph,
	surface: Surface,
): SurfaceConfigRecord | undefined {
	return graph.surfaceConfigs.find((record) => record.surface === surface);
}

export function validateConfigObject({
	graph,
	surface,
	config,
	artifactPath,
}: ConfigValidationInput): readonly Diagnostic[] {
	const surfaceConfig = getSurfaceConfig(graph, surface);
	if (surfaceConfig === undefined) {
		return [
			{
				code: "missing-surface-config",
				level: "error",
				message: `Missing surface config for '${surface}'.`,
				path: artifactPath,
			},
		];
	}

	const diagnostics: Diagnostic[] = [];
	const emittedPaths = flattenConfigKeyPaths(config);
	for (const emittedPath of emittedPaths) {
		if (!matchesAny(emittedPath, surfaceConfig.allowed_key_paths)) {
			diagnostics.push({
				code: "unknown-config-key",
				level: "error",
				message: `Surface '${surface}' emitted non-allowlisted config key '${emittedPath}'.`,
				path: artifactPath,
			});
		}

		if (matchesAny(emittedPath, surfaceConfig.do_not_emit_key_paths)) {
			diagnostics.push({
				code: "blocked-config-key",
				level: "error",
				message: `Surface '${surface}' emitted blocked config key '${emittedPath}'.`,
				path: artifactPath,
			});
		}
	}

	for (const replacement of surfaceConfig.replacements) {
		if (
			emittedPaths.includes(replacement.from) &&
			!emittedPaths.includes(replacement.to)
		) {
			diagnostics.push({
				code: "missing-config-replacement",
				level: "error",
				message: `Surface '${surface}' emitted '${replacement.from}' without replacement '${replacement.to}'.`,
				path: artifactPath,
			});
		}
	}

	return diagnostics;
}

export function flattenConfigKeyPaths(config: unknown): readonly string[] {
	const paths: string[] = [];
	flattenIntoPaths(config, [], paths);
	return paths.sort();
}

function flattenIntoPaths(
	value: unknown,
	prefix: readonly string[],
	paths: string[],
): void {
	if (Array.isArray(value)) {
		if (
			value.length > 0 &&
			value.every(
				(item) =>
					typeof item === "object" && item !== null && !Array.isArray(item),
			)
		) {
			for (const item of value) {
				flattenIntoPaths(item, prefix, paths);
			}
			return;
		}
		if (prefix.length > 0) {
			paths.push(prefix.join("."));
		}
		return;
	}

	if (typeof value !== "object" || value === null) {
		if (prefix.length > 0) {
			paths.push(prefix.join("."));
		}
		return;
	}

	const entries = Object.entries(value);
	if (entries.length === 0 && prefix.length > 0) {
		paths.push(prefix.join("."));
		return;
	}

	for (const [key, child] of entries) {
		flattenIntoPaths(child, [...prefix, key], paths);
	}
}

function matchesAny(path: string, patterns: readonly string[]): boolean {
	return patterns.some((pattern) => matchesKeyPath(path, pattern));
}

function matchesKeyPath(path: string, pattern: string): boolean {
	const pathParts = path.split(".");
	const patternParts = pattern.split(".");
	if (pathParts.length !== patternParts.length) {
		return false;
	}

	return patternParts.every(
		(patternPart, index) =>
			patternPart === "*" || patternPart === pathParts[index],
	);
}
