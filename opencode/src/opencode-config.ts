import type { InstallScope } from "./types.ts";

export interface OpenCodeConfig {
	$schema: string;
	mcp?: Record<string, unknown>;
	agent?: Record<string, unknown>;
	instructions?: string[];
}

const DISABLE_BUILTIN_AGENTS = ["build", "plan", "explore", "general"] as const;

export function buildAgentDisableConfig(): Record<string, unknown> {
	const config: Record<string, unknown> = {};
	for (const role of DISABLE_BUILTIN_AGENTS) {
		config[role] = { disable: true };
	}
	return config;
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

export function buildMcpConfig(): Record<string, unknown> {
	return {
		context7: {
			type: "remote",
			url: "https://mcp.context7.com/mcp",
			headers: {
				CONTEXT7_API_KEY:
					process.env["CONTEXT7_API_KEY"] ?? "your-api-key-here",
			},
			enabled: true,
		},
		octocode: {
			type: "local",
			command: ["bunx", "--bun", "octocode-mcp@latest"],
			environment: {
				GITHUB_TOKEN: process.env["GITHUB_TOKEN"] ?? "your-api-key-here",
			},
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
		agent: buildAgentDisableConfig(),
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

export function mergeAgentDisableConfig(
	existing: Record<string, unknown>,
	agentDisableConfig: Record<string, unknown>,
): Record<string, unknown> {
	const existingAgent = (existing["agent"] as Record<string, unknown>) ?? {};
	if (Object.keys(existingAgent).length > 0) {
		return { ...existing, agent: deepMerge(existingAgent, agentDisableConfig) };
	}

	return { ...existing, agent: agentDisableConfig };
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
