import { describe, expect, it } from "bun:test";
import {
	buildMcpConfig,
	buildOpenCodeJsonc,
	mergeInstructions,
	pruneLegacyOpenAgentsMcpServers,
} from "./opencode-config.ts";

describe("mergeInstructions", () => {
	it("adds managed instruction files without dropping existing entries", () => {
		const merged = mergeInstructions(
			{
				instructions: ["docs/team-rules.md"],
				mcp: buildMcpConfig(),
			},
			[".opencode/instructions/openagentsbtw.md"],
		);

		expect(merged["instructions"]).toEqual([
			"docs/team-rules.md",
			".opencode/instructions/openagentsbtw.md",
		]);
	});

	it("deduplicates managed instruction files", () => {
		const merged = mergeInstructions(
			{
				instructions: [".opencode/instructions/openagentsbtw.md"],
			},
			[".opencode/instructions/openagentsbtw.md"],
		);

		expect(merged["instructions"]).toEqual([
			".opencode/instructions/openagentsbtw.md",
		]);
	});
});

describe("pruneLegacyOpenAgentsMcpServers", () => {
	it("removes legacy chrome-devtools and browsermcp entries without touching core MCP", () => {
		const pruned = pruneLegacyOpenAgentsMcpServers({
			mcp: {
				...buildMcpConfig({ deepwikiEnabled: true }),
				"chrome-devtools": {
					type: "local",
					command: ["bunx", "-y", "chrome-devtools-mcp@latest"],
					enabled: true,
				},
				browsermcp: {
					type: "local",
					command: ["bunx", "-y", "@browsermcp/mcp@latest"],
					enabled: true,
				},
			},
		});

		const mcp = pruned["mcp"] as Record<string, unknown>;
		expect(mcp["chrome-devtools"]).toBeUndefined();
		expect(mcp["browsermcp"]).toBeUndefined();
		expect(mcp["deepwiki"]).toBeTruthy();
	});
});

describe("buildOpenCodeJsonc", () => {
	it("keeps native OpenCode agents enabled by default", () => {
		const parsed = JSON.parse(buildOpenCodeJsonc()) as Record<string, unknown>;
		expect(parsed["agent"]).toBeUndefined();
		expect(parsed["instructions"]).toEqual([]);
	});
});
