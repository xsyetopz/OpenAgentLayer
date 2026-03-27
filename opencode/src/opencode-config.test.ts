import { describe, expect, it } from "bun:test";
import {
	buildAgentDisableConfig,
	buildMcpConfig,
	mergeInstructions,
} from "./opencode-config.ts";

describe("mergeInstructions", () => {
	it("adds managed instruction files without dropping existing entries", () => {
		const merged = mergeInstructions(
			{
				instructions: ["docs/team-rules.md"],
				mcp: buildMcpConfig(),
				agent: buildAgentDisableConfig(),
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
