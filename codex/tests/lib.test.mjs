import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	prependBinToPath,
	writeExecutableSync,
} from "../../tests/support/fake-command.mjs";

import {
	matchPlaceholders,
	matchPrototypeScaffolding,
} from "../hooks/scripts/_lib.mjs";
import { getRtkRewrite } from "../hooks/scripts/_rtk.mjs";

describe("codex hook lib", () => {
	it("matches soft hedges in prose lines", () => {
		const { hard, soft } = matchPlaceholders("README.md", [
			"For now this is acceptable.",
		]);
		assert.equal(hard.length, 0);
		assert.equal(soft.length, 1);
	});

	it("does not match soft hedges in code lines unless they are comments", () => {
		const plainCode = matchPlaceholders("src/foo.ts", ["const forNow = true;"]);
		assert.equal(plainCode.soft.length, 0);

		const comment = matchPlaceholders("src/foo.ts", [
			"// for now: keep it simple",
		]);
		assert.equal(comment.soft.length, 1);
	});

	it("supports cca-allow suppression", () => {
		const suppressed = matchPlaceholders("src/foo.ts", [
			"// for now: known edge case // cca-allow",
		]);
		assert.equal(suppressed.hard.length, 0);
		assert.equal(suppressed.soft.length, 0);
	});

	it("matches prototype scaffolding comments", () => {
		const hits = matchPrototypeScaffolding("src/foo.ts", [
			"// prototype implementation until the real service lands",
		]);
		assert.equal(hits.length, 1);
	});
});

function withFakeRtk(options = {}) {
	const tempRoot = mkdtempSync(join(tmpdir(), "oabtw-codex-rtk-"));
	const binDir = join(tempRoot, "bin");
	const repoDir = join(tempRoot, "repo");
	const homeDir = join(tempRoot, "home");
	mkdirSync(binDir, { recursive: true });
	mkdirSync(repoDir, { recursive: true });
	mkdirSync(join(homeDir, ".config", "openagentsbtw"), { recursive: true });

	writeExecutableSync(binDir, "rtk", {
		unix: `#!/bin/sh
set -eu
if [ "$1" = "--version" ]; then
  printf '%s\\n' 'rtk 0.23.0'
  exit 0
fi
if [ "$1" = "rewrite" ]; then
  shift
  [ "$*" = "cargo test" ] || exit 1
  printf '%s\\n' 'rtk cargo test'
  exit ${options.rewriteStatus ?? 0}
fi
exit 1
`,
		windows: [
			"@echo off",
			"setlocal EnableDelayedExpansion",
			'if "%1"=="--version" (',
			"  echo rtk 0.23.0",
			"  exit /b 0",
			")",
			'if not "%1"=="rewrite" exit /b 1',
			"shift",
			'set "all=%1"',
			":collect",
			"shift",
			'if "%1"=="" goto rewritten',
			'set "all=!all! %1"',
			"goto collect",
			":rewritten",
			'if /I "!all!"=="cargo test" (',
			"  echo rtk cargo test",
			"  exit /b 0",
			")",
			"exit /b 1",
		].join("\r\n"),
	});

	if (options.repoRtk !== false) {
		writeFileSync(join(repoDir, "RTK.md"), "# RTK\nAlways use rtk.\n");
	}
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
		homeDir,
		repoDir,
		binDir,
	};
}

describe("codex RTK helper", () => {
	it("returns a rewrite when repo RTK policy and rtk are present", () => {
		const fixture = withFakeRtk();
		const originalHome = process.env.HOME;
		const originalPath = process.env.PATH;
		process.env.HOME = fixture.homeDir;
		process.env.PATH = prependBinToPath(fixture.binDir, originalPath || "");
		try {
			const rewrite = getRtkRewrite("cargo test", fixture.repoDir);
			assert.deepEqual(rewrite, {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact cargo test",
			});
		} finally {
			process.env.HOME = originalHome;
			process.env.PATH = originalPath;
			fixture.cleanup();
		}
	});

	it("accepts rtk rewrite stdout when rtk exits nonzero", () => {
		const fixture = withFakeRtk({ rewriteStatus: 3 });
		const originalHome = process.env.HOME;
		const originalPath = process.env.PATH;
		process.env.HOME = fixture.homeDir;
		process.env.PATH = prependBinToPath(fixture.binDir, originalPath || "");
		try {
			const rewrite = getRtkRewrite("cargo test", fixture.repoDir);
			assert.deepEqual(rewrite, {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact cargo test",
			});
		} finally {
			process.env.HOME = originalHome;
			process.env.PATH = originalPath;
			fixture.cleanup();
		}
	});

	it("applies high-gain rewrites before proxy fallback", () => {
		const fixture = withFakeRtk();
		const originalHome = process.env.HOME;
		const originalPath = process.env.PATH;
		process.env.HOME = fixture.homeDir;
		process.env.PATH = prependBinToPath(fixture.binDir, originalPath || "");
		try {
			assert.deepEqual(getRtkRewrite("bun test tests", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact test bun test tests",
			});
			assert.deepEqual(
				getRtkRewrite("bun run test:unit --watch", fixture.repoDir),
				{
					policyPath: join(fixture.repoDir, "RTK.md"),
					rewritten: "rtk --ultra-compact test bun run test:unit --watch",
				},
			);
			assert.deepEqual(getRtkRewrite("bunx tsc --noEmit", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact tsc --noEmit",
			});
			assert.match(
				getRtkRewrite("bunx --cwd opencode tsc --noEmit", fixture.repoDir)
					.rewritten,
				/^rtk --ultra-compact proxy -- bash -lc 'cd opencode && rtk --ultra-compact tsc --noEmit'$/,
			);
			assert.deepEqual(getRtkRewrite("npm test", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact test npm test",
			});
			assert.deepEqual(getRtkRewrite("pnpm test", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact test pnpm test",
			});
			assert.deepEqual(
				getRtkRewrite("dotnet test --no-build", fixture.repoDir),
				{
					policyPath: join(fixture.repoDir, "RTK.md"),
					rewritten: "rtk --ultra-compact dotnet test --no-build",
				},
			);
			assert.deepEqual(getRtkRewrite("node --test", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact test node --test",
			});
			assert.deepEqual(getRtkRewrite("flutter test", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact test flutter test",
			});
			assert.deepEqual(getRtkRewrite("env", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact env",
			});
			assert.deepEqual(getRtkRewrite("jq . package.json", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact json package.json",
			});
			assert.deepEqual(getRtkRewrite("cat package.json", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact read package.json",
			});
			assert.deepEqual(
				getRtkRewrite("sed -n '1,5p' README.md", fixture.repoDir),
				{
					policyPath: join(fixture.repoDir, "RTK.md"),
					rewritten: "rtk --ultra-compact read --max-lines 5 README.md",
				},
			);
			assert.deepEqual(getRtkRewrite("bun run typecheck", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact tsc --noEmit",
			});
			assert.deepEqual(
				getRtkRewrite(
					"bunx biome check . --max-diagnostics 16384",
					fixture.repoDir,
				),
				{
					policyPath: join(fixture.repoDir, "RTK.md"),
					rewritten:
						"rtk --ultra-compact summary bunx biome check . --max-diagnostics 16384",
				},
			);
			assert.deepEqual(getRtkRewrite("bun run build", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact err bun run build",
			});
			assert.deepEqual(getRtkRewrite("rg -n foo src", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact grep -n foo src",
			});
			assert.deepEqual(getRtkRewrite("make test", fixture.repoDir), {
				policyPath: join(fixture.repoDir, "RTK.md"),
				rewritten: "rtk --ultra-compact test make test",
			});
		} finally {
			process.env.HOME = originalHome;
			process.env.PATH = originalPath;
			fixture.cleanup();
		}
	});

	it("falls back to rtk proxy for unsupported complex commands", () => {
		const fixture = withFakeRtk();
		const originalHome = process.env.HOME;
		const originalPath = process.env.PATH;
		process.env.HOME = fixture.homeDir;
		process.env.PATH = prependBinToPath(fixture.binDir, originalPath || "");
		try {
			const rewrite = getRtkRewrite(
				"bun test tests && echo done",
				fixture.repoDir,
			);
			assert.equal(rewrite.policyPath, join(fixture.repoDir, "RTK.md"));
			assert.match(rewrite.rewritten, /^rtk --ultra-compact proxy -- /);
			assert.match(rewrite.rewritten, /bun test/);
		} finally {
			process.env.HOME = originalHome;
			process.env.PATH = originalPath;
			fixture.cleanup();
		}
	});

	it("falls back to the managed home RTK policy", () => {
		const fixture = withFakeRtk({ repoRtk: false, homeRtk: true });
		const originalHome = process.env.HOME;
		const originalPath = process.env.PATH;
		process.env.HOME = fixture.homeDir;
		process.env.PATH = prependBinToPath(fixture.binDir, originalPath || "");
		try {
			const rewrite = getRtkRewrite("cargo test", fixture.repoDir);
			assert.deepEqual(rewrite, {
				policyPath: join(fixture.homeDir, ".config", "openagentsbtw", "RTK.md"),
				rewritten: "rtk --ultra-compact cargo test",
			});
		} finally {
			process.env.HOME = originalHome;
			process.env.PATH = originalPath;
			fixture.cleanup();
		}
	});
});
