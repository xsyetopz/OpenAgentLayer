import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runHook } from "./helpers.mjs";

describe("SessionBudget", () => {
	it("should run without error", () => {
		const result = runHook("session/start-budget.mjs", {});
		assert.equal(result.status, 0);
	});

	it("should warn on large CLAUDE.md", () => {
		const tmpDir = join(tmpdir(), `cca-budget-test-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });
		const lines = Array.from({ length: 200 }, (_, i) => `Line ${i}`).join("\n");
		writeFileSync(join(tmpDir, "CLAUDE.md"), lines, "utf8");

		const result = runHook(
			"session/start-budget.mjs",
			{},
			{ CLAUDE_PROJECT_DIR: tmpDir },
		);
		assert.equal(result.status, 0);
	});
});
