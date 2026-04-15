import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
	prependBinToPath,
	writeExecutableSync,
} from "../../tests/support/fake-command.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(
	__dirname,
	"..",
	"hooks",
	"scripts",
	"session",
	"run-codex-filtered.mjs",
);
const tempDirs = [];

function runFiltered(env = {}) {
	return spawnSync(
		process.execPath,
		[SCRIPT, "exec", "--profile", "openagentsbtw", "Task"],
		{
			encoding: "utf8",
			env: { ...process.env, ...env },
			timeout: 15000,
		},
	);
}

afterEach(() => {
	while (tempDirs.length > 0) {
		rmSync(tempDirs.pop(), { recursive: true, force: true });
	}
});

describe("run-codex-filtered", () => {
	it("drops multiline hook context but keeps warnings and normal output", () => {
		const root = mkdtempSync(join(tmpdir(), "oabtw-codex-filter-"));
		tempDirs.push(root);
		const binDir = join(root, "bin");
		const codexStub = writeExecutableSync(binDir, "codex", {
			unix: `#!/bin/sh
printf '%s\n' 'SessionStart hook (completed)'
printf '%s\n' '  hook context: openagentsbtw memory:'
printf '%s\n' 'Project recap: too noisy'
printf '\n'
printf '%s\n' 'warning: keep this'
printf '%s\n' 'normal line'
`,
			windows: [
				"@echo off",
				"echo SessionStart hook (completed)",
				"echo   hook context: openagentsbtw memory:",
				"echo Project recap: too noisy",
				"echo.",
				"echo warning: keep this",
				"echo normal line",
			].join("\r\n"),
		});
		chmodSync(codexStub, 0o755);
		const result = runFiltered({
			PATH: prependBinToPath(binDir, process.env.PATH ?? ""),
		});
		assert.equal(result.status, 0);
		assert.equal(result.stdout.includes("hook context:"), false);
		assert.equal(result.stdout.includes("Project recap: too noisy"), false);
		assert.match(result.stdout, /warning: keep this/);
		assert.match(result.stdout, /normal line/);
	});
});
