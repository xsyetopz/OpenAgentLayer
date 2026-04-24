import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
	mergeCodexConfig,
	updateCodexMarketplace,
} from "../scripts/install/managed-files.mjs";

describe("managed Codex config", () => {
	it("keeps the stable openagentsbtw top-level profile across plan presets", async () => {
		const tmp = await mkdtemp(path.join(os.tmpdir(), "oabtw-codex-config-"));
		const target = path.join(tmp, "config.toml");
		try {
			await writeFile(target, 'profile = "legacy"\n');
			await mergeCodexConfig({
				target,
				profileAction: "true",
				profileName: "openagentsbtw",
				planName: "pro-20",
				deepwiki: false,
			});
			const config = await readFile(target, "utf8");
			assert.match(config, /^profile = "openagentsbtw"$/m);
			assert.match(config, /\[profiles\.openagentsbtw\]/);
			assert.match(config, /\[profiles\.openagentsbtw-implement\]/);
			assert.equal(config.includes("openagentsbtw-pro-20"), false);
			assert.equal(config.includes("openagentsbtw-plus"), false);
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});

	it("writes managed root keys before existing TOML tables", async () => {
		const tmp = await mkdtemp(path.join(os.tmpdir(), "oabtw-codex-config-"));
		const target = path.join(tmp, "config.toml");
		try {
			await writeFile(target, '[projects."/repo"]\ntrust_level = "trusted"\n');
			await mergeCodexConfig({
				target,
				profileAction: "true",
				profileName: "openagentsbtw",
				planName: "pro-20",
				deepwiki: false,
			});
			const config = await readFile(target, "utf8");
			assert.ok(
				config.indexOf('sqlite_home = "~/.codex/openagentsbtw/sqlite"') <
					config.indexOf('[projects."/repo"]'),
			);
			assert.ok(
				config.indexOf("[profiles.openagentsbtw]") <
					config.indexOf('[projects."/repo"]'),
			);
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});

	it("keeps sample-only schema and advanced examples out of merged managed blocks", async () => {
		const tmp = await mkdtemp(path.join(os.tmpdir(), "oabtw-codex-config-"));
		const target = path.join(tmp, "config.toml");
		try {
			await writeFile(target, "");
			await mergeCodexConfig({
				target,
				profileAction: "false",
				profileName: "openagentsbtw",
				planName: "pro-5",
				deepwiki: false,
			});
			const config = await readFile(target, "utf8");
			assert.equal(config.includes("#:schema"), false);
			assert.equal(config.includes("default_permissions = "), false);
			assert.equal(config.includes("[apps._default]"), false);
			assert.equal(config.includes("approval_policy = { granular = {"), false);
			assert.match(config, /^review_model = "gpt-5\.3-codex"$/m);
			assert.match(config, /^web_search = "cached"$/m);
			assert.match(config, /^approvals_reviewer = "auto_review"$/m);
			assert.match(config, /^\[tools\]$/m);
			assert.match(config, /^view_image = true$/m);
			assert.match(config, /^agents\.job_max_runtime_seconds = 2700$/m);
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});

	it("writes marketplace entries to the concrete local plugin path", async () => {
		const tmp = await mkdtemp(path.join(os.tmpdir(), "oabtw-codex-market-"));
		const target = path.join(tmp, "marketplace.json");
		const pluginPath = path.join(tmp, ".codex", "plugins", "openagentsbtw");
		try {
			await updateCodexMarketplace({ target, pluginPath });
			const payload = JSON.parse(await readFile(target, "utf8"));
			const entry = payload.plugins.find(
				(plugin) => plugin.name === "openagentsbtw",
			);
			assert.equal(entry.source.path, pluginPath);
			assert.equal(entry.policy.installation, "AVAILABLE");
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});
});
