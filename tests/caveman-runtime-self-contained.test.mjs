import { afterEach, describe, it } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const tempDirs = [];

function makeTempDir(prefix) {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

function runNode(script, input, env = {}) {
	return spawnSync(process.execPath, [script], {
		input: JSON.stringify(input),
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

describe("managed Caveman runtimes", () => {
	it("stay self-contained in installed hook layouts", () => {
		const home = makeTempDir("oabtw-caveman-runtime-");

		const codexHooksRoot = join(home, ".codex", "openagentsbtw", "hooks");
		cpSync(resolve(ROOT, "codex", "hooks"), codexHooksRoot, {
			recursive: true,
		});
		const codexResult = runNode(
			join(codexHooksRoot, "scripts", "session", "start-budget.mjs"),
			{ cwd: ROOT },
			{ HOME: home, PATH: "/bin:/usr/bin" },
		);
		assert.equal(codexResult.status, 0, codexResult.stderr);

		const claudeHooksRoot = join(home, "claude-dist", "hooks");
		cpSync(resolve(ROOT, "claude", "hooks"), claudeHooksRoot, {
			recursive: true,
		});
		const claudeResult = runNode(
			join(claudeHooksRoot, "scripts", "session", "start-budget.mjs"),
			{},
			{ HOME: home, CLAUDE_PROJECT_DIR: ROOT },
		);
		assert.equal(claudeResult.status, 0, claudeResult.stderr);

		const copilotRoot = join(home, ".copilot", "hooks", "openagentsbtw");
		cpSync(resolve(ROOT, "copilot", "hooks"), copilotRoot, { recursive: true });
		const copilotResult = runNode(
			join(
				copilotRoot,
				"scripts",
				"openagentsbtw",
				"session",
				"start-budget.mjs",
			),
			{ source: "startup" },
			{ HOME: home },
		);
		assert.equal(copilotResult.status, 0, copilotResult.stderr);
	});
});
