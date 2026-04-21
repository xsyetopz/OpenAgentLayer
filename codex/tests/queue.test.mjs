import { afterEach, describe, it } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	addQueueEntry,
	clearQueueEntries,
	listQueueEntries,
	parseQueueCommand,
	retryQueueEntry,
	takeNextAutoEntry,
} from "../hooks/scripts/session/_queue.mjs";

const roots = [];

function makeFixture() {
	const root = mkdtempSync(join(tmpdir(), "oabtw-queue-"));
	const home = join(root, "home");
	const cwd = join(root, "repo");
	roots.push(root);
	mkdirSync(home, { recursive: true });
	mkdirSync(cwd, { recursive: true });
	spawnSync("git", ["init"], { cwd, stdio: "ignore" });
	return { home, cwd };
}

function runPromptHook(cwd, home, prompt) {
	return spawnSync("node", ["codex/hooks/scripts/session/prompt-queue.mjs"], {
		cwd: process.cwd(),
		input: JSON.stringify({ cwd, prompt }),
		encoding: "utf8",
		env: { ...process.env, HOME: home },
	});
}

afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe("deferred prompt queue", () => {
	it("parses queue commands", () => {
		assert.deepEqual(parseQueueCommand("queue: follow up"), {
			action: "add",
			auto: false,
			message: "follow up",
		});
		assert.deepEqual(parseQueueCommand("/queue --auto run tests"), {
			action: "add",
			auto: true,
			message: "run tests",
		});
		assert.equal(parseQueueCommand("normal task"), null);
		assert.equal(parseQueueCommand("/queuefoo"), null);
	});

	it("stores, retries, clears, and dispatches entries", () => {
		const { home, cwd } = makeFixture();
		const first = addQueueEntry("write docs", { cwd, home });
		const second = addQueueEntry("run tests", { cwd, home, auto: true });
		assert.equal(first.record.id, "q-0001");
		assert.equal(second.record.state, "auto");
		assert.equal(listQueueEntries({ cwd, home }).length, 2);

		const dispatched = takeNextAutoEntry({ cwd, home });
		assert.equal(dispatched.record.id, "q-0002");
		assert.equal(listQueueEntries({ cwd, home })[1].state, "dispatched");

		const retried = retryQueueEntry("q-0002", { cwd, home });
		assert.equal(retried.ok, true);
		assert.equal(listQueueEntries({ cwd, home })[1].state, "pending");

		clearQueueEntries({ cwd, home });
		assert.equal(listQueueEntries({ cwd, home })[0].state, "cancelled");
	});

	it("intercepts codex queue prompts before normal processing", () => {
		const { home, cwd } = makeFixture();
		const hookOutput = runPromptHook(cwd, home, "/queue follow this later");
		assert.equal(hookOutput.status, 0);
		const payload = JSON.parse(hookOutput.stdout);
		assert.equal(payload.continue, false);
		assert.match(payload.systemMessage, /Queued q-0001/);
		assert.equal(
			listQueueEntries({ cwd, home })[0].message,
			"follow this later",
		);
	});
});

it("dispatches one auto entry from the codex stop hook", () => {
	const { home, cwd } = makeFixture();
	addQueueEntry("run queued validation", { cwd, home, auto: true });
	const transcriptPath = join(cwd, "transcript.jsonl");
	writeFileSync(transcriptPath, '{"message":"done"}\n');
	const hookOutput = spawnSync(
		"node",
		["codex/hooks/scripts/post/stop-scan.mjs"],
		{
			cwd: process.cwd(),
			input: JSON.stringify({
				cwd,
				prompt: "",
				transcript_path: transcriptPath,
			}),
			encoding: "utf8",
			env: { ...process.env, HOME: home },
		},
	);
	assert.equal(hookOutput.status, 0);
	const payload = JSON.parse(hookOutput.stdout);
	assert.equal(payload.continue, false);
	assert.equal(payload.stopReason, "openagentsbtw queue dispatch");
	assert.match(payload.systemMessage, /run queued validation/);
	assert.equal(listQueueEntries({ cwd, home })[0].state, "dispatched");
});
