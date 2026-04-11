import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { runStopChecks } from "../copilot/hooks/scripts/openagentsbtw/post/_stop-shared.mjs";

const TMP_DIRS = [];

function run(cwd, args) {
	execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
}

function createRepo() {
	const root = mkdtempSync(join(tmpdir(), "oabtw-copilot-stop-"));
	TMP_DIRS.push(root);
	run(root, ["init"]);
	run(root, ["config", "user.email", "test@example.com"]);
	run(root, ["config", "user.name", "Test User"]);
	writeFileSync(join(root, "src.js"), "export const value = 1;\n");
	writeFileSync(join(root, "README.md"), "# Test\n");
	run(root, ["add", "src.js", "README.md"]);
	run(root, ["commit", "-m", "init"]);
	return root;
}

afterEach(() => {
	while (TMP_DIRS.length > 0) {
		rmSync(TMP_DIRS.pop(), { recursive: true, force: true });
	}
});

describe("Copilot stop scan", () => {
	it("blocks docs-only changes on edit-required routes", () => {
		const repo = createRepo();
		writeFileSync(join(repo, "README.md"), "# Changed\n");
		const transcriptPath = join(repo, "transcript.txt");
		writeFileSync(transcriptPath, "finished implementation\n");

		const result = runStopChecks({
			cwd: repo,
			agentName: "hephaestus",
			transcriptPath,
			finalResponse: "Implemented the requested change.",
		});

		assert.equal(result.type, "block");
		assert.match(result.message, /docs-only changes are not accepted/);
	});

	it("allows production edits on edit-required routes", () => {
		const repo = createRepo();
		writeFileSync(join(repo, "src.js"), "export const value = 2;\n");
		const transcriptPath = join(repo, "transcript.txt");
		writeFileSync(transcriptPath, "finished implementation\n");

		const result = runStopChecks({
			cwd: repo,
			agentName: "hephaestus",
			transcriptPath,
			finalResponse: "Implemented the requested change in src.js.",
		});

		assert.equal(result.type, "pass");
	});

	it("blocks execution-required routes without execution evidence", () => {
		const repo = createRepo();
		const transcriptPath = join(repo, "transcript.txt");
		writeFileSync(transcriptPath, "I would run the tests next.\n");

		const result = runStopChecks({
			cwd: repo,
			agentName: "atalanta",
			transcriptPath,
			finalResponse: "I would run the tests and inspect failures.",
		});

		assert.equal(result.type, "block");
		assert.match(result.message, /execution evidence is required/);
	});

	it("allows strict BLOCKED results without edits", () => {
		const repo = createRepo();
		const transcriptPath = join(repo, "transcript.txt");
		writeFileSync(transcriptPath, "BLOCKED: missing integration fixture\n");

		const result = runStopChecks({
			cwd: repo,
			agentName: "hephaestus",
			transcriptPath,
			finalResponse: "BLOCKED: missing integration fixture",
		});

		assert.equal(result.type, "pass");
	});
});
