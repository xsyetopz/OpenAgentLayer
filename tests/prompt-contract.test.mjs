import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
	return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("prompt contract hardening", () => {
	it("keeps explicit no-permission-seeking close policy in canonical guidance", () => {
		const shared = read("source/shared/constraints.md");
		const codexOverlay = read("source/platform-overlays/codex-agent.md");
		assert.match(shared, /Turn-closure contract:/);
		assert.match(codexOverlay, /Never close with permission-seeking phrasing/);
	});

	it("uses declarative queue next-step wording", () => {
		const codexQueue = read("codex/hooks/scripts/session/_queue.mjs");
		const claudeQueue = read("claude/hooks/scripts/session/_queue.mjs");
		assert.match(codexQueue, /After this task, run \\`\/queue next\\`/);
		assert.match(claudeQueue, /After this task, run \\`\/queue next\\`/);
		assert.doesNotMatch(codexQueue, /if you want to process one manually/);
		assert.doesNotMatch(claudeQueue, /if you want to process one manually/);
	});

	it("treats caveman regex drift as advisory, not hard block", () => {
		const codexStop = read("codex/hooks/scripts/post/stop-scan.mjs");
		const claudeStop = read("claude/hooks/scripts/post/_stop-shared.mjs");
		assert.match(codexStop, /detected prose drift \(advisory\)/);
		assert.match(claudeStop, /detected prose drift \(advisory\)/);
		assert.doesNotMatch(codexStop, /rejected verbose assistant prose/);
		assert.doesNotMatch(claudeStop, /rejected verbose assistant prose/);
	});
});
