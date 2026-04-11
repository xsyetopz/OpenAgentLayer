import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { parseHookOutput, runHook } from "./helpers.mjs";

const tempDirs = [];

function makeRepo() {
	const dir = mkdtempSync(join(tmpdir(), "cca-route-contracts-"));
	tempDirs.push(dir);
	execFileSync("git", ["init"], { cwd: dir });
	execFileSync("git", ["config", "user.email", "test@example.com"], {
		cwd: dir,
	});
	execFileSync("git", ["config", "user.name", "Test User"], { cwd: dir });
	writeFileSync(join(dir, "src.js"), "export const value = 1;\n", "utf8");
	writeFileSync(join(dir, "README.md"), "# Test Repo\n", "utf8");
	execFileSync("git", ["add", "."], { cwd: dir });
	execFileSync("git", ["commit", "-m", "init"], { cwd: dir });
	return dir;
}

function makeTranscript(dir, contract) {
	const transcriptPath = join(dir, "transcript.txt");
	writeFileSync(
		transcriptPath,
		[
			`OPENAGENTSBTW_ROUTE=${contract.route}`,
			`OPENAGENTSBTW_CONTRACT=${contract.routeKind}`,
			`OPENAGENTSBTW_ALLOW_BLOCKED=${String(contract.allowBlocked ?? true)}`,
			`OPENAGENTSBTW_ALLOW_DOCS_ONLY=${String(contract.allowDocsOnly ?? true)}`,
			`OPENAGENTSBTW_ALLOW_TESTS_ONLY=${String(contract.allowTestsOnly ?? true)}`,
			`OPENAGENTSBTW_REJECT_PROTOTYPE_SCAFFOLDING=${String(contract.rejectPrototypeScaffolding ?? false)}`,
		].join("\n"),
		"utf8",
	);
	return transcriptPath;
}

afterEach(() => {
	while (tempDirs.length > 0) {
		rmSync(tempDirs.pop(), { recursive: true, force: true });
	}
});

describe("Claude route context hooks", () => {
	it("emits hidden route markers for /cca skills", () => {
		const result = runHook("session/prompt-git-context.mjs", {
			prompt: "/cca:review inspect the change",
		});
		const output = parseHookOutput(result);
		assert.equal(output.suppressOutput, true);
		assert.equal(output.hookSpecificOutput.hookEventName, "UserPromptSubmit");
		assert.match(
			output.hookSpecificOutput.additionalContext,
			/OPENAGENTSBTW_ROUTE=review/,
		);
		assert.match(
			output.hookSpecificOutput.additionalContext,
			/OPENAGENTSBTW_CONTRACT=readonly/,
		);
	});

	it("emits hidden route markers for openagentsbtw subagents", () => {
		const result = runHook("session/subagent-route-context.mjs", {
			agent_type: "hephaestus",
		});
		const output = parseHookOutput(result);
		assert.equal(output.suppressOutput, true);
		assert.equal(output.hookSpecificOutput.hookEventName, "SubagentStart");
		assert.match(
			output.hookSpecificOutput.additionalContext,
			/OPENAGENTSBTW_CONTRACT=edit-required/,
		);
		assert.match(
			output.hookSpecificOutput.additionalContext,
			/OPENAGENTSBTW_AGENT=hephaestus/,
		);
	});
});

describe("Claude stop gates", () => {
	it("blocks edit-required completion when no production code changed", () => {
		const dir = makeRepo();
		const transcriptPath = makeTranscript(dir, {
			route: "hephaestus",
			routeKind: "edit-required",
			allowDocsOnly: false,
			allowTestsOnly: false,
			rejectPrototypeScaffolding: true,
		});
		const result = runHook(
			"post/stop-scan.mjs",
			{
				cwd: dir,
				transcript_path: transcriptPath,
				last_assistant_message: "Implemented the requested fix.",
			},
			{},
			{ cwd: dir },
		);
		assert.equal(result.status, 2);
		const output = JSON.parse(result.stdout.trim());
		assert.match(output.reason, /no production-code files changed/);
	});

	it("blocks docs-only churn on edit-required routes", () => {
		const dir = makeRepo();
		writeFileSync(join(dir, "README.md"), "# Updated Docs\n", "utf8");
		const transcriptPath = makeTranscript(dir, {
			route: "hephaestus",
			routeKind: "edit-required",
			allowDocsOnly: false,
			allowTestsOnly: false,
			rejectPrototypeScaffolding: true,
		});
		const result = runHook(
			"post/stop-scan.mjs",
			{
				cwd: dir,
				transcript_path: transcriptPath,
				last_assistant_message: "Implemented the requested fix.",
			},
			{},
			{ cwd: dir },
		);
		assert.equal(result.status, 2);
		const output = JSON.parse(result.stdout.trim());
		assert.match(output.reason, /docs-only changes are not accepted/);
	});

	it("allows strict BLOCKED results on edit-required routes", () => {
		const dir = makeRepo();
		const transcriptPath = makeTranscript(dir, {
			route: "hephaestus",
			routeKind: "edit-required",
			allowDocsOnly: false,
			allowTestsOnly: false,
			rejectPrototypeScaffolding: true,
		});
		const result = runHook(
			"post/stop-scan.mjs",
			{
				cwd: dir,
				transcript_path: transcriptPath,
				last_assistant_message: "BLOCKED: missing private SDK fixture",
			},
			{},
			{ cwd: dir },
		);
		assert.equal(result.status, 0);
		assert.equal(result.stdout.trim(), "");
	});

	it("blocks execution-required completion without evidence", () => {
		const dir = makeRepo();
		const transcriptPath = makeTranscript(dir, {
			route: "atalanta",
			routeKind: "execution-required",
			rejectPrototypeScaffolding: false,
		});
		const result = runHook(
			"post/subagent-scan.mjs",
			{
				cwd: dir,
				agent_type: "atalanta",
				agent_transcript_path: transcriptPath,
				last_assistant_message: "Validation is complete.",
			},
			{},
			{ cwd: dir },
		);
		assert.equal(result.status, 2);
		const output = JSON.parse(result.stdout.trim());
		assert.match(output.reason, /execution evidence was not found/);
	});
});
