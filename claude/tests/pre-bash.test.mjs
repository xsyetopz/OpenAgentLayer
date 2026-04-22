import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	prependBinToPath,
	writeExecutableSync,
} from "../../tests/support/fake-command.mjs";
import { parseHookOutput, runHook } from "./helpers.mjs";

function makeBashInput(command) {
	return { tool_name: "Bash", tool_input: { command } };
}

function withFakeRtk(options = {}) {
	const tempRoot = mkdtempSync(join(tmpdir(), "oabtw-rtk-"));
	const binDir = join(tempRoot, "bin");
	mkdirSync(binDir, { recursive: true });

	const rewriteMap = options.rewriteMap ?? { "cargo test": "rtk cargo test" };
	const rewriteCases = Object.entries(rewriteMap)
		.map(
			([command, rewritten]) =>
				`    ${JSON.stringify(command)}) printf '%s\\n' ${JSON.stringify(rewritten)} ;;`,
		)
		.join("\n");
	const windowsRewriteCases = Object.entries(rewriteMap)
		.map(
			([command, rewritten]) =>
				`if /I "!all!"=="${command}" (\r\n  echo ${rewritten}\r\n  exit /b 0\r\n)`,
		)
		.join("\r\n");

	writeExecutableSync(binDir, "rtk", {
		unix: `#!/bin/sh
set -eu
if [ "$1" = "--version" ]; then
  printf '%s\\n' 'rtk 0.23.0'
  exit 0
fi
if [ "$1" = "rewrite" ]; then
  shift
  case "$*" in
${rewriteCases}
    *) exit 1 ;;
  esac
  exit ${options.rewriteStatus ?? 0}
fi
exit 1
`,
		windows: `@echo off\r\nsetlocal EnableDelayedExpansion\r\nif "%1"=="--version" (\r\necho rtk 0.23.0\r\nexit /b 0\r\n)\r\nif not "%1"=="rewrite" exit /b 1\r\nshift\r\nset "all=%1"\r\n:collect\r\nshift\r\nif "%1"=="" goto rewritten\r\nset "all=!all! %1"\r\ngoto collect\r\n:rewritten\r\n${windowsRewriteCases}\r\nexit /b 1\r\n`,
	});

	const repoDir = join(tempRoot, "repo");
	mkdirSync(repoDir, { recursive: true });
	if (options.repoRtk !== false) {
		writeFileSync(join(repoDir, "RTK.md"), "# RTK\nAlways use rtk.\n");
	}

	const homeDir = join(tempRoot, "home");
	mkdirSync(join(homeDir, ".config", "openagentsbtw"), { recursive: true });
	if (options.homeRtk) {
		writeFileSync(
			join(homeDir, ".config", "openagentsbtw", "RTK.md"),
			"# RTK\nAlways use rtk.\n",
		);
	}

	return {
		cleanup() {
			rmSync(tempRoot, { recursive: true, force: true });
		},
		env: {
			HOME: homeDir,
			PATH: prependBinToPath(binDir, process.env.PATH || ""),
		},
		repoDir,
	};
}

describe("BlockedCommands", () => {
	it("should block rm -rf root", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("rm -rf /* "));
		assert.ok(
			result.status === 2 ||
				result.stdout.toLowerCase().includes("block") ||
				result.stdout.toLowerCase().includes("deny"),
		);
	});

	it("should block rm -rf home", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("rm -rf ~/"));
		assert.ok(
			result.status === 2 ||
				result.stdout.toLowerCase().includes("block") ||
				result.stdout.toLowerCase().includes("deny"),
		);
	});

	it("should block blanket git add", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("git add ."));
		assert.ok(
			result.status === 2 ||
				result.stdout.toLowerCase().includes("block") ||
				result.stdout.toLowerCase().includes("deny"),
		);
	});

	it("should block git add -A", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("git add -A"));
		assert.ok(
			result.status === 2 ||
				result.stdout.toLowerCase().includes("block") ||
				result.stdout.toLowerCase().includes("deny"),
		);
	});
});

describe("AllowedCommands", () => {
	it("should allow git status", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("git status"));
		const output = parseHookOutput(result);
		assert.notEqual(result.status, 2);
		if (output?.hookSpecificOutput) {
			assert.notEqual(output.hookSpecificOutput.permissionDecision, "deny");
		}
	});

	it("should allow ls", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("ls -la"));
		assert.notEqual(result.status, 2);
	});

	it("should allow specific git add", () => {
		const result = runHook(
			"pre/bash-guard.mjs",
			makeBashInput("git add src/main.py"),
		);
		assert.notEqual(result.status, 2);
	});

	it("should allow make", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("make test"));
		assert.notEqual(result.status, 2);
	});

	it("auto-adds Claude co-author trailer when git commit is missing one", () => {
		const result = runHook(
			"pre/bash-guard.mjs",
			makeBashInput("git commit -m 'feat: add x'"),
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "allow");
		assert.match(
			output?.hookSpecificOutput?.updatedInput?.command || "",
			/--trailer 'Co-Authored-By: Claude <noreply@anthropic\.com>'$/,
		);
	});

	it("blocks malformed canonical co-author domains", () => {
		const result = runHook(
			"pre/bash-guard.mjs",
			makeBashInput(
				'git commit -m "feat: add x\n\nCo-Authored-By: GPT 5.4 <noreply@openai>"',
			),
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
		assert.match(
			output?.hookSpecificOutput?.permissionDecisionReason || "",
			/noreply@openai\.com/,
		);
	});
});

describe("RTK enforce", () => {
	it("should auto-rewrite Claude Bash input when RTK.md and rtk are available", () => {
		const fixture = withFakeRtk({ repoRtk: false, homeRtk: true });
		try {
			const result = runHook(
				"pre/rtk-enforce.mjs",
				{
					tool_name: "Bash",
					tool_input: { command: "cargo test", description: "Run tests" },
				},
				fixture.env,
			);
			const output = parseHookOutput(result);
			assert.equal(output?.hookSpecificOutput?.permissionDecision, "allow");
			assert.deepEqual(output?.hookSpecificOutput?.updatedInput, {
				command: "rtk cargo test",
				description: "Run tests",
			});
		} finally {
			fixture.cleanup();
		}
	});

	it("should auto-rewrite when rtk exits nonzero with rewritten stdout", () => {
		const fixture = withFakeRtk({
			repoRtk: false,
			homeRtk: true,
			rewriteStatus: 3,
		});
		try {
			const result = runHook(
				"pre/rtk-enforce.mjs",
				makeBashInput("cargo test"),
				fixture.env,
			);
			const output = parseHookOutput(result);
			assert.equal(output?.hookSpecificOutput?.permissionDecision, "allow");
			assert.equal(
				output?.hookSpecificOutput?.updatedInput.command,
				"rtk cargo test",
			);
		} finally {
			fixture.cleanup();
		}
	});

	it("should apply high-gain rewrites when RTK policy is active", () => {
		const fixture = withFakeRtk({ repoRtk: false, homeRtk: true });
		try {
			let result = runHook(
				"pre/rtk-enforce.mjs",
				makeBashInput("npm test"),
				fixture.env,
			);
			let output = parseHookOutput(result);
			assert.equal(output?.hookSpecificOutput?.permissionDecision, "allow");
			assert.equal(
				output?.hookSpecificOutput?.updatedInput.command,
				"rtk test npm test",
			);

			result = runHook(
				"pre/rtk-enforce.mjs",
				makeBashInput("sed -n '1,5p' README.md"),
				fixture.env,
			);
			output = parseHookOutput(result);
			assert.equal(output?.hookSpecificOutput?.permissionDecision, "allow");
			assert.equal(
				output?.hookSpecificOutput?.updatedInput.command,
				"rtk read --max-lines 5 README.md",
			);
		} finally {
			fixture.cleanup();
		}
	});

	it("should proxy unsupported complex commands when RTK policy is active", () => {
		const fixture = withFakeRtk({ repoRtk: false, homeRtk: true });
		try {
			const result = runHook(
				"pre/rtk-enforce.mjs",
				makeBashInput("bun test tests && echo done"),
				fixture.env,
			);
			const output = parseHookOutput(result);
			assert.equal(output?.hookSpecificOutput?.permissionDecision, "allow");
			assert.match(
				output?.hookSpecificOutput?.updatedInput.command,
				/^rtk proxy -- /,
			);
		} finally {
			fixture.cleanup();
		}
	});

	it("should pass through when RTK.md is absent", () => {
		const fixture = withFakeRtk({ repoRtk: false });
		try {
			const result = runHook(
				"pre/rtk-enforce.mjs",
				makeBashInput("cargo test"),
				fixture.env,
			);
			assert.equal(result.stdout.trim(), "");
		} finally {
			fixture.cleanup();
		}
	});
});
