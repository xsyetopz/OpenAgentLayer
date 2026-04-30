import { afterEach, describe, it } from "bun:test";
import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	applySharedVersion,
	bumpSemver,
	getSharedVersion,
	RELEASE_FILES,
	resolveNextVersion,
} from "../scripts/version-cli.mjs";

const tempDirs = [];

function makeWorkspace(version = "1.3.3") {
	const dir = mkdtempSync(path.join(tmpdir(), "oabtw-version-"));
	tempDirs.push(dir);

	const files = {
		"claude/.claude-plugin/plugin.json": {
			name: "openagentsbtw",
			version,
		},
		"claude/.claude-plugin/marketplace.json": {
			name: "openagentsbtw",
			plugins: [{ name: "openagentsbtw", version }],
		},
		"codex/plugin/openagentsbtw/.codex-plugin/plugin.json": {
			name: "openagentsbtw",
			version,
		},
		"opencode/package.json": {
			name: "openagentsbtw",
			version,
		},
	};

	for (const [relativePath, payload] of Object.entries(files)) {
		const absolutePath = path.join(dir, relativePath);
		mkdirSync(path.dirname(absolutePath), { recursive: true });
		writeFileSync(
			absolutePath,
			`${JSON.stringify(payload, null, 2)}\n`,
			"utf8",
		);
	}

	return dir;
}

afterEach(() => {
	while (tempDirs.length > 0) {
		rmSync(tempDirs.pop(), { recursive: true, force: true });
	}
});

describe("version cli helpers", () => {
	it("bumps semver by kind", () => {
		assert.equal(bumpSemver("1.3.3", "patch"), "1.3.4");
		assert.equal(bumpSemver("1.3.3", "minor"), "1.4.0");
		assert.equal(bumpSemver("1.3.3", "major"), "2.0.0");
	});

	it("accepts maj/min/pat aliases and explicit versions", () => {
		assert.equal(resolveNextVersion("1.3.3", "pat"), "1.3.4");
		assert.equal(resolveNextVersion("1.3.3", "min"), "1.4.0");
		assert.equal(resolveNextVersion("1.3.3", "maj"), "2.0.0");
		assert.equal(resolveNextVersion("1.3.3", "2.4.6"), "2.4.6");
	});

	it("reads and updates the shared framework/tool version together", async () => {
		const dir = makeWorkspace();
		assert.equal(await getSharedVersion(dir), "1.3.3");

		const result = await applySharedVersion("1.3.4", dir);
		assert.equal(result.from, "1.3.3");
		assert.equal(result.to, "1.3.4");
		assert.deepEqual(result.files, RELEASE_FILES);

		for (const relativePath of RELEASE_FILES) {
			const payload = JSON.parse(
				readFileSync(path.join(dir, relativePath), "utf8"),
			);
			const version =
				relativePath === "claude/.claude-plugin/marketplace.json"
					? payload.plugins[0].version
					: payload.version;
			assert.equal(version, "1.3.4");
		}
	});

	it("fails if release surfaces drift out of sync", async () => {
		const dir = makeWorkspace();
		const marketplacePath = path.join(
			dir,
			"claude/.claude-plugin/marketplace.json",
		);
		const payload = JSON.parse(readFileSync(marketplacePath, "utf8"));
		payload.plugins[0].version = "9.9.9";
		writeFileSync(
			marketplacePath,
			`${JSON.stringify(payload, null, 2)}\n`,
			"utf8",
		);

		await assert.rejects(() => getSharedVersion(dir), /drifted/);
	});
});
