import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateUpstreamFile } from "../scripts/sync-caveman-upstream.mjs";
import { CAVEMAN_UPSTREAM } from "../source/caveman.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function readRepo(relativePath) {
	return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function submoduleHead() {
	return execFileSync(
		"git",
		["-C", resolve(ROOT, CAVEMAN_UPSTREAM.sourcePath), "rev-parse", "HEAD"],
		{
			encoding: "utf8",
		},
	).trim();
}

describe("caveman upstream reference", () => {
	it("requires an initialized caveman submodule at the configured source path", () => {
		const status = execFileSync(
			"git",
			["submodule", "status", "--", CAVEMAN_UPSTREAM.sourcePath],
			{
				cwd: ROOT,
				encoding: "utf8",
			},
		).trim();
		assert.equal(status.startsWith("-"), false, "submodule is not initialized");
	});

	it("pins caveman submodule to the configured upstream ref", () => {
		assert.equal(submoduleHead(), CAVEMAN_UPSTREAM.ref);
	});

	it("validates required upstream Caveman markers from submodule files", () => {
		for (const relativePath of CAVEMAN_UPSTREAM.files) {
			assert.equal(
				validateUpstreamFile(
					relativePath,
					readRepo(`${CAVEMAN_UPSTREAM.sourcePath}/${relativePath}`),
				),
				true,
			);
		}
	});
});
