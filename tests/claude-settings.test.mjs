import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	mergeClaudeSettings,
	renderClaudeSettingsTemplate,
} from "../scripts/install/claude-settings.mjs";

describe("Claude settings merge", () => {
	it("renders the Claude template with escaped home and model placeholders", () => {
		const rendered = renderClaudeSettingsTemplate(
			'{"statusLine":{"command":"bash __HOME__/.claude/statusline-command.sh"},"env":{"ANTHROPIC_DEFAULT_OPUS_MODEL":"__OPUS_MODEL__"}}',
			{
				homeDir: String.raw`C:\Users\krystian`,
				models: {
					opusModel: "claude-opus-4-6[1m]",
					sonnetModel: "claude-sonnet-4-6",
					haikuModel: "claude-haiku-4-5",
				},
			},
		);
		assert.equal(
			rendered.statusLine.command,
			String.raw`bash C:\Users\krystian/.claude/statusline-command.sh`,
		);
		assert.equal(
			rendered.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
			"claude-opus-4-6[1m]",
		);
	});

	it("preserves unknown keys and merges managed Claude settings objects", () => {
		const merged = mergeClaudeSettings({
			template: {
				outputStyle: "CCA",
				env: { A: "1" },
				enabledPlugins: { "openagentsbtw@openagentsbtw": true },
				extraKnownMarketplaces: { openagentsbtw: { source: { repo: "x" } } },
				mcpServers: {
					"chrome-devtools": {
						command: "bunx",
						args: ["-y", "chrome-devtools-mcp@latest"],
					},
					firstParty: { type: "stdio" },
				},
			},
			existing: {
				userOnly: true,
				env: { B: "2" },
				enabledPlugins: { existing: true },
				extraKnownMarketplaces: { existing: { source: { repo: "y" } } },
				mcpServers: {
					browsermcp: {
						command: "bunx",
						args: ["-y", "@browsermcp/mcp@latest"],
					},
					custom: { type: "http", url: "https://example.test" },
				},
			},
			model: "opusplan",
			deepwiki: true,
		});

		assert.equal(merged.userOnly, true);
		assert.deepEqual(merged.env, { A: "1", B: "2" });
		assert.equal(merged.enabledPlugins["openagentsbtw@openagentsbtw"], true);
		assert.equal(merged.enabledPlugins.existing, true);
		assert.ok(merged.extraKnownMarketplaces.openagentsbtw);
		assert.ok(merged.extraKnownMarketplaces.existing);
		assert.ok(merged.mcpServers.firstParty);
		assert.ok(merged.mcpServers.custom);
		assert.equal(merged.mcpServers["chrome-devtools"], undefined);
		assert.equal(merged.mcpServers.browsermcp, undefined);
		assert.deepEqual(merged.mcpServers.deepwiki, {
			type: "http",
			url: "https://mcp.deepwiki.com/mcp",
			enabled: true,
		});
		assert.equal(merged.model, "opusplan");
	});
});
