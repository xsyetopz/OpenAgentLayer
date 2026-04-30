import { afterEach, describe, it } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(
	__dirname,
	"..",
	"hooks",
	"scripts",
	"session",
	"start-budget.mjs",
);
const tempDirs = [];

function makeHome() {
	const home = mkdtempSync(join(tmpdir(), "oabtw-codex-start-"));
	tempDirs.push(home);
	return home;
}

function installFallbackWrapper(home) {
	const wrapper = join(home, ".codex", "openagentsbtw", "bin", "oabtw-codex");
	mkdirSync(dirname(wrapper), { recursive: true });
	writeFileSync(wrapper, "#!/bin/sh\nexit 0\n", "utf8");
	chmodSync(wrapper, 0o755);
}

function runHook(home) {
	return spawnHook({
		cwd: process.cwd(),
		env: {
			HOME: home,
			PATH: "/bin:/usr/bin",
		},
	});
}

function spawnHook({ cwd, env }) {
	return spawnSync(process.execPath, [HOOK], {
		input: JSON.stringify({ cwd }),
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

describe("codex SessionStart", () => {
	it("does not warn when the direct fallback wrapper exists", () => {
		const home = makeHome();
		installFallbackWrapper(home);
		const result = runHook(home);
		assert.equal(result.status, 0);
		const output = JSON.parse(result.stdout);
		assert.equal(
			String(output.systemMessage || "").includes("wrapper is unavailable"),
			false,
		);
	});

	it("warns when no wrapper entrypoint is available", () => {
		const home = makeHome();
		const result = runHook(home);
		assert.equal(result.status, 0);
		const output = JSON.parse(result.stdout);
		assert.match(output.systemMessage, /oabtw-codex wrapper is unavailable/);
	});
});
