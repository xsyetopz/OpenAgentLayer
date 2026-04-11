import type { InstallScope } from "./types.ts";

export interface OpenCodeConfig {
	$schema: string;
	mcp?: Record<string, unknown>;
	instructions?: string[];
}

export async function resolveConfigPath(scope: InstallScope): Promise<string> {
	const homeDir = process.env["HOME"] ?? "";
	const xdgConfigHome = process.env["XDG_CONFIG_HOME"];
	const configDir =
		typeof xdgConfigHome === "string"
			? xdgConfigHome
			: homeDir
				? `${homeDir}/.config`
				: "";

	const scopePaths =
		scope === "global"
			? configDir
				? [
						`${configDir}/opencode/opencode.jsonc`,
						`${configDir}/opencode/opencode.json`,
					]
				: []
			: [`${process.cwd()}/opencode.jsonc`, `${process.cwd()}/opencode.json`];

	for (const path of scopePaths) {
		if (await Bun.file(path).exists()) {
			return path;
		}
	}

	if (scopePaths.length > 0 && scopePaths[0]) {
		return scopePaths[0];
	}

	throw new Error(
		"Unable to resolve opencode config path: No candidate paths available.",
	);
}

export function buildMcpConfig(options?: {
	deepwikiEnabled?: boolean;
}): Record<string, unknown> {
	if (!options?.deepwikiEnabled) {
		return {};
	}

	return {
		deepwiki: {
			type: "remote",
			url: "https://mcp.deepwiki.com/mcp",
			enabled: true,
		},
	};
}

function deepMerge(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = { ...target };
	for (const key of Object.keys(source)) {
		if (
			source[key] &&
			typeof source[key] === "object" &&
			!Array.isArray(source[key]) &&
			result[key] &&
			typeof result[key] === "object" &&
			!Array.isArray(result[key])
		) {
			result[key] = deepMerge(
				result[key] as Record<string, unknown>,
				source[key] as Record<string, unknown>,
			);
		} else {
			result[key] = source[key];
		}
	}
	return result;
}

export function buildOpenCodeJsonc(): string {
	const config = {
		$schema: "https://opencode.ai/config.json",
		mcp: buildMcpConfig(),
		instructions: [],
	};
	return JSON.stringify(config, undefined, 2);
}

export function mergeInstructions(
	existing: Record<string, unknown>,
	instructions: string[],
): Record<string, unknown> {
	const current = Array.isArray(existing["instructions"])
		? (existing["instructions"] as string[])
		: [];
	const merged = [...current];
	for (const instruction of instructions) {
		if (!merged.includes(instruction)) {
			merged.push(instruction);
		}
	}
	return { ...existing, instructions: merged };
}

export function mergeMcpConfig(
	existing: Record<string, unknown>,
	mcpConfig: Record<string, unknown>,
): Record<string, unknown> {
	const existingMcp = (existing["mcp"] as Record<string, unknown>) ?? {};
	if (Object.keys(existingMcp).length > 0) {
		return { ...existing, mcp: deepMerge(existingMcp, mcpConfig) };
	}

	return { ...existing, mcp: mcpConfig };
}

export function pruneLegacyOpenAgentsMcpServers(
	existing: Record<string, unknown>,
): Record<string, unknown> {
	const currentMcp = (existing["mcp"] as Record<string, unknown>) ?? {};
	if (!currentMcp || typeof currentMcp !== "object") {
		return existing;
	}

	const nextMcp: Record<string, unknown> = { ...currentMcp };

	const chrome = nextMcp["chrome-devtools"];
	if (
		chrome &&
		typeof chrome === "object" &&
		(chrome as Record<string, unknown>)["type"] === "local" &&
		JSON.stringify((chrome as Record<string, unknown>)["command"]) ===
			JSON.stringify(["bunx", "-y", "chrome-devtools-mcp@latest"])
	) {
		delete nextMcp["chrome-devtools"];
	}

	const browser = nextMcp["browsermcp"];
	if (
		browser &&
		typeof browser === "object" &&
		(browser as Record<string, unknown>)["type"] === "local" &&
		JSON.stringify((browser as Record<string, unknown>)["command"]) ===
			JSON.stringify(["bunx", "-y", "@browsermcp/mcp@latest"])
	) {
		delete nextMcp["browsermcp"];
	}

	return { ...existing, mcp: nextMcp };
}

export function parseJsonc(text: string): Record<string, unknown> {
	const cleaned = text
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, (match, offset, fullText) => {
			const preceding = fullText.slice(0, offset);
			const quoteCount = (preceding.match(/"/g) || []).length;
			if (quoteCount % 2 === 1) {
				return match;
			}
			return "";
		});
	return JSON.parse(cleaned) as Record<string, unknown>;
}

export function stringifyJsonc(obj: Record<string, unknown>): string {
	return JSON.stringify(obj, undefined, 2);
}
