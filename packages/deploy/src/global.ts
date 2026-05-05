import { join } from "node:path";
import type { Artifact } from "@openagentlayer/artifact";
import type { Provider } from "@openagentlayer/source";

const CODEX_AGENT_CONFIG_FILE = /config_file = "\.\/agents\/([^"]+)"/g;

export function globalArtifacts(
	home: string,
	artifacts: readonly Artifact[],
): Artifact[] {
	return artifacts.map((artifact) => globalArtifact(home, artifact));
}

function globalArtifact(home: string, artifact: Artifact): Artifact {
	const path = globalPath(artifact.provider, artifact.path);
	return {
		...artifact,
		path,
		content: globalContent(
			home,
			artifact.provider,
			artifact.path,
			artifact.content,
		),
	};
}

function globalPath(provider: Provider, path: string): string {
	if (provider === "codex") {
		if (path === "AGENTS.md") return ".codex/AGENTS.md";
		return path;
	}
	if (provider === "claude") {
		if (path === "CLAUDE.md") return ".claude/CLAUDE.md";
		return path;
	}
	if (path === "opencode.jsonc") return ".config/opencode/opencode.jsonc";
	if (path.startsWith(".opencode/"))
		return `.config/opencode/${path.slice(".opencode/".length)}`;
	return path;
}

function globalContent(
	home: string,
	provider: Provider,
	path: string,
	content: string,
): string {
	if (provider === "codex" && path === ".codex/config.toml")
		return content.replaceAll(
			CODEX_AGENT_CONFIG_FILE,
			(_match, file) =>
				`config_file = ${JSON.stringify(join(home, ".codex/agents", file))}`,
		);
	if (provider === "codex" && path === ".codex/hooks.json")
		return content.replaceAll(
			".codex/openagentlayer/hooks/",
			() => `${join(home, ".codex/openagentlayer/hooks")}/`,
		);
	if (provider === "claude" && path === ".claude/settings.json")
		return content
			.replaceAll(
				".claude/hooks/scripts/",
				() => `${join(home, ".claude/hooks/scripts")}/`,
			)
			.replaceAll('".claude/plugins/marketplaces/openagentlayer"', () =>
				JSON.stringify(
					join(home, ".claude/plugins/marketplaces/openagentlayer"),
				),
			);
	if (provider === "opencode" && path === "opencode.jsonc")
		return content
			.replaceAll(
				'".opencode/instructions/openagentlayer.md"',
				() => '"instructions/openagentlayer.md"',
			)
			.replaceAll(
				'"./.opencode/plugins/openagentlayer.ts"',
				() => '"./plugins/openagentlayer.ts"',
			);
	return content;
}
