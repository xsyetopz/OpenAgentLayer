import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { mergeCodexConfig } from "../scripts/install/managed-files.mjs";

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
});
