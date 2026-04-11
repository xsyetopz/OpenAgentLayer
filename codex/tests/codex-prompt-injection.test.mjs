import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
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
const tempDirs = [];

function runHook(inputJson, env = {}) {
	return spawnSync("node", [HOOK], {
		input: JSON.stringify(inputJson),
		encoding: "utf8",
		env: { ...process.env, ...env },
		timeout: 15000,
	});
}

afterEach(() => {
	while (tempDirs.length > 0) {
		rmSync(tempDirs.pop(), { recursive: true, force: true });
	}
});

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

	it("injects managed Caveman mode", () => {
		const home = mkdtempSync(resolve(tmpdir(), "codex-caveman-home-"));
		tempDirs.push(home);
		mkdirSync(resolve(home, ".config", "openagentsbtw"), { recursive: true });
		writeFileSync(
			resolve(home, ".config", "openagentsbtw", "config.env"),
			"OABTW_CAVEMAN_MODE=lite\n",
			"utf8",
		);
		const result = runHook(
			{ prompt: "hello", cwd: process.cwd() },
			{ HOME: home, XDG_CONFIG_HOME: resolve(home, ".config") },
		);
		assert.equal(result.status, 0);
		assert.match(result.stdout, /OPENAGENTSBTW_CAVEMAN_MODE=lite/);
	});
});
