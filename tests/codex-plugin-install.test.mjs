import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	codexPluginCacheTarget,
	installCodexPluginPayload,
	validateCodexPluginPayload,
	writeCodexMarketplace,
} from "../scripts/install/codex-plugin-install.mjs";

function normalizePathSeparators(filepath) {
	return filepath.replaceAll("\\", "/");
}

async function writePlugin(root, version = "9.9.9") {
	await mkdir(path.join(root, ".codex-plugin"), { recursive: true });
	writeFileSync(
		path.join(root, ".codex-plugin", "plugin.json"),
		JSON.stringify({ name: "openagentsbtw", version }, null, 2),
	);
	for (const skill of ["openagentsbtw", "review", "caveman"]) {
		await mkdir(path.join(root, "skills", skill), { recursive: true });
		writeFileSync(path.join(root, "skills", skill, "SKILL.md"), `# ${skill}\n`);
	}
}

describe("Codex plugin install payload", () => {
	it("installs source and active cache payload while pruning stale versions", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-codex-plugin-"));
		try {
			const source = path.join(root, "source");
			const codexHome = path.join(root, ".codex");
			const pluginTarget = path.join(codexHome, "plugins", "openagentsbtw");
			await writePlugin(source, "9.9.9");
			const stale = codexPluginCacheTarget({ codexHome, version: "1.0.0" });
			await mkdir(stale, { recursive: true });
			writeFileSync(path.join(stale, "stale.txt"), "stale");
			const other = path.join(
				codexHome,
				"plugins",
				"cache",
				"openagentsbtw-local",
				"other-plugin",
				"1.0.0",
			);
			await mkdir(other, { recursive: true });
			writeFileSync(path.join(other, "keep.txt"), "keep");

			const result = await installCodexPluginPayload({
				source,
				pluginTarget,
				codexHome,
			});

			assert.equal(result.version, "9.9.9");
			assert.equal(
				existsSync(path.join(pluginTarget, ".codex-plugin", "plugin.json")),
				true,
			);
			assert.equal(
				existsSync(
					path.join(result.cacheTarget, "skills", "review", "SKILL.md"),
				),
				true,
			);
			assert.equal(existsSync(stale), false);
			assert.equal(readFileSync(path.join(other, "keep.txt"), "utf8"), "keep");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("validates cache skills and reports missing installed payload", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-codex-plugin-"));
		try {
			const codexHome = path.join(root, ".codex");
			const pluginTarget = path.join(codexHome, "plugins", "openagentsbtw");
			await writePlugin(pluginTarget, "9.9.9");

			const validation = await validateCodexPluginPayload({
				pluginTarget,
				codexHome,
			});

			assert.equal(validation.version, "9.9.9");
			assert.equal(validation.missing.length, 4);
			assert.match(
				normalizePathSeparators(validation.missing[0]),
				/plugins\/cache\/openagentsbtw-local/,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("writes marketplace entry to the actual local plugin path", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-codex-plugin-"));
		try {
			const target = path.join(root, "marketplace.json");
			const pluginPath = path.join(root, ".codex", "plugins", "openagentsbtw");
			await writeCodexMarketplace({ target, pluginPath });
			const payload = JSON.parse(readFileSync(target, "utf8"));
			assert.equal(payload.name, "openagentsbtw-local");
			assert.equal(payload.plugins[0].source.path, pluginPath);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
