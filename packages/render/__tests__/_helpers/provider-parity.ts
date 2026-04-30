import type { AdapterBundle } from "@openagentlayer/adapter-contract";
import {
	flattenConfigKeyPaths,
	validateConfigObject,
} from "@openagentlayer/adapters/shared";
import type { SourceGraph, Surface, UnknownMap } from "@openagentlayer/types";
import { artifactContent } from "./registry";

export interface ProviderConfigParityResult {
	readonly blockedPathsPresent: readonly string[];
	readonly diagnostics: ReturnType<typeof validateConfigObject>;
	readonly emittedPaths: readonly string[];
	readonly replacementSourcesPresent: readonly string[];
	readonly surfaceConfigFound: boolean;
}

export function parsedProviderConfig(bundle: AdapterBundle): UnknownMap {
	switch (bundle.surface) {
		case "codex":
			return Bun.TOML.parse(
				requiredArtifact(bundle, ".codex/config.toml"),
			) as UnknownMap;
		case "claude":
			return JSON.parse(
				requiredArtifact(bundle, ".claude/settings.json"),
			) as UnknownMap;
		case "opencode":
			return JSON.parse(
				requiredArtifact(bundle, "opencode.json"),
			) as UnknownMap;
		default:
			throw new Error(`Unsupported provider bundle: ${bundle.surface}`);
	}
}

export function providerConfigParityResult(
	graph: SourceGraph,
	bundle: AdapterBundle,
): ProviderConfigParityResult {
	const artifactPath = providerConfigPath(bundle.surface);
	const config = parsedProviderConfig(bundle);
	const diagnostics = validateConfigObject({
		artifactPath,
		config,
		graph,
		surface: bundle.surface,
	});

	const emittedPaths = flattenConfigKeyPaths(config);
	const surfaceConfig = graph.surfaceConfigs.find(
		(record) => record.surface === bundle.surface,
	);
	return {
		blockedPathsPresent: (surfaceConfig?.do_not_emit_key_paths ?? []).filter(
			(path) => emittedPaths.includes(path),
		),
		diagnostics,
		emittedPaths,
		replacementSourcesPresent: (surfaceConfig?.replacements ?? [])
			.map((replacement) => replacement.from)
			.filter((path) => emittedPaths.includes(path)),
		surfaceConfigFound: surfaceConfig !== undefined,
	};
}

export function artifactInstallMode(
	bundle: AdapterBundle,
	path: string,
): "full-file" | "marked-text-block" | "structured-object" | undefined {
	const artifact = bundle.artifacts.find((entry) => entry.path === path);
	return artifact === undefined
		? undefined
		: (artifact.installMode ?? "full-file");
}

export function renderedContents(bundle: AdapterBundle): readonly string[] {
	return bundle.artifacts.map((artifact) => artifact.content);
}

function providerConfigPath(surface: Surface): string {
	switch (surface) {
		case "codex":
			return ".codex/config.toml";
		case "claude":
			return ".claude/settings.json";
		case "opencode":
			return "opencode.json";
		default:
			throw new Error(`Unsupported provider surface: ${surface}`);
	}
}

function requiredArtifact(bundle: AdapterBundle, path: string): string {
	const content = artifactContent(bundle, path);
	if (content === undefined) {
		throw new Error(`Missing artifact ${bundle.surface}:${path}`);
	}
	return content;
}
