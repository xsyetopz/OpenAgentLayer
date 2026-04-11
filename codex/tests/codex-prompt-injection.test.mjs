import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(
	__dirname,
	"..",
	"hooks",
	"scripts",
	"session",
	"prompt-git-context.mjs",
);

function runHook(inputJson) {
	return spawnSync("node", [HOOK], {
		input: JSON.stringify(inputJson),
		encoding: "utf8",
		timeout: 15000,
	});
}

describe("codex UserPromptSubmit injection", () => {
	it("injects git/memory context by default (no $openagentsbtw token)", () => {
		const result = runHook({ prompt: "hello", cwd: process.cwd() });
		assert.equal(result.status, 0);
		assert.ok(result.stdout.includes("openagentsbtw git context:"));
		assert.equal(result.stdout.trimStart().startsWith("$openagentsbtw"), false);
		assert.equal(
			result.stdout
				.split("\n")
				.map((line) => line.trim())
				.includes("$openagentsbtw"),
			false,
		);
	});

	it("respects !raw opt-out", () => {
		const result = runHook({ prompt: "!raw hello", cwd: process.cwd() });
		assert.equal(result.status, 0);
		assert.equal(result.stdout, "");
	});
});
