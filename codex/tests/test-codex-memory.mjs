import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import {
	forgetProjectMemory,
	hasSqliteSupport,
	loadProjectMemory,
	memoryDbPath,
	persistTurnMemory,
	pruneMemory,
} from "../hooks/scripts/_memory.mjs";

const tempRoots = [];

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "oabtw-codex-memory-"));
	tempRoots.push(root);
	const home = join(root, "home");
	const cwd = join(root, "project");
	mkdirSync(home, { recursive: true });
	mkdirSync(cwd, { recursive: true });
	const transcriptPath = join(root, "transcript.jsonl");
	writeFileSync(
		transcriptPath,
		`${JSON.stringify({ prompt: "fix auth race", text: "implemented auth lock and tests" })}\n`,
	);
	return { home, cwd, transcriptPath };
}

describe("codex memory overlay", () => {
	it("persists, loads, prunes, and forgets project memory", async () => {
		if (!(await hasSqliteSupport())) return;

		const { home, cwd, transcriptPath } = fixture();
		await persistTurnMemory(
			{
				session_id: "session-1",
				turn_id: "turn-1",
				cwd,
				transcript_path: transcriptPath,
				prompt: "fix auth race in login flow",
				last_assistant_message:
					"Implemented locking and added regression coverage.",
				model: "gpt-5.3-codex",
			},
			{ home },
		);
		await persistTurnMemory(
			{
				session_id: "session-2",
				turn_id: "turn-2",
				cwd,
				transcript_path: transcriptPath,
				prompt: "tighten the README install section",
				last_assistant_message:
					"Updated the install steps and noted the memory commands.",
				model: "gpt-5.3-codex",
			},
			{ home },
		);

		const memory = await loadProjectMemory(cwd, { home });
		assert.equal(memory.available, true);
		assert.match(memory.projectSummary, /fix auth race/i);
		assert.equal(memory.recentSummaries.length, 2);
		assert.match(memory.recentSummaries[0], /README install section/i);
		assert.match(memoryDbPath(home), /memory\.sqlite$/);

		await pruneMemory({ home, maxSessionsPerProject: 1 });
		const pruned = await loadProjectMemory(cwd, { home });
		assert.equal(pruned.recentSummaries.length, 1);
		assert.match(pruned.projectSummary, /README install section/i);

		const removed = await forgetProjectMemory(cwd, { home });
		assert.equal(removed, true);
		const empty = await loadProjectMemory(cwd, { home });
		assert.equal(empty.projectSummary, "");
		assert.equal(empty.recentSummaries.length, 0);
	});
});
