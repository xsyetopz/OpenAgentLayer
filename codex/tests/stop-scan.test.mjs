import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(
	__dirname,
	"..",
	"hooks",
	"scripts",
	"post",
	"stop-scan.mjs",
);

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			...options,
			stdio: ["pipe", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", reject);
		child.on("exit", (code) => resolve({ code: code ?? 1, stdout, stderr }));
	});
}

async function initRepo() {
	const root = await mkdtemp(path.join(os.tmpdir(), "oabtw-stop-scan-"));
	await run("git", ["init"], { cwd: root });
	await run("git", ["config", "user.email", "tests@example.com"], {
		cwd: root,
	});
	await run("git", ["config", "user.name", "Tests"], { cwd: root });
	await writeFile(path.join(root, "README.md"), "# Test repo\n");
	await writeFile(path.join(root, "src.ts"), "export const value = 1;\n");
	await run("git", ["add", "README.md", "src.ts"], { cwd: root });
	await run("git", ["commit", "-m", "init"], { cwd: root });
	return root;
}

async function invokeHook(root, payload) {
	return new Promise((resolve, reject) => {
		const child = spawn("node", [HOOK], {
			cwd: root,
			env: { ...process.env, HOME: root },
			stdio: ["pipe", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", reject);
		child.on("exit", (code) => resolve({ code: code ?? 1, stdout, stderr }));
		child.stdin.end(JSON.stringify(payload));
	});
}

describe("codex stop scan", () => {
	it("blocks edit-required completions without production edits", async () => {
		const root = await initRepo();
		try {
			const result = await invokeHook(root, {
				cwd: root,
				prompt:
					"OPENAGENTSBTW_ROUTE=implement\nOPENAGENTSBTW_CONTRACT=edit-required",
				last_assistant_message: "Here is how I would implement this change.",
			});
			assert.equal(result.code, 0);
			const payload = JSON.parse(result.stdout);
			assert.equal(payload.continue, false);
			assert.match(payload.systemMessage, /no production-code files changed/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("blocks docs-only completions on edit-required routes", async () => {
		const root = await initRepo();
		try {
			await writeFile(path.join(root, "README.md"), "Updated docs only.\n");
			const result = await invokeHook(root, {
				cwd: root,
				prompt:
					"OPENAGENTSBTW_ROUTE=implement\nOPENAGENTSBTW_CONTRACT=edit-required\nOPENAGENTSBTW_ALLOW_DOCS_ONLY=false",
				last_assistant_message: "Implemented the requested change.",
			});
			const payload = JSON.parse(result.stdout);
			assert.equal(payload.continue, false);
			assert.match(payload.systemMessage, /docs-only changes are not accepted/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("blocks prototype scaffolding on edit-required routes", async () => {
		const root = await initRepo();
		try {
			await writeFile(
				path.join(root, "src.ts"),
				"// prototype implementation\nexport const value = 2;\n",
			);
			const result = await invokeHook(root, {
				cwd: root,
				prompt:
					"OPENAGENTSBTW_ROUTE=implement\nOPENAGENTSBTW_CONTRACT=edit-required\nOPENAGENTSBTW_REJECT_PROTOTYPE_SCAFFOLDING=true",
				last_assistant_message: "Implemented src.ts.",
			});
			const payload = JSON.parse(result.stdout);
			assert.equal(payload.continue, false);
			assert.match(payload.systemMessage, /prototype\/demo scaffolding/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("allows production edits on edit-required routes", async () => {
		const root = await initRepo();
		try {
			const transcriptPath = path.join(root, "transcript.jsonl");
			await writeFile(transcriptPath, '{"message":"implemented"}\n');
			await writeFile(path.join(root, "src.ts"), "export const value = 2;\n");
			const result = await invokeHook(root, {
				cwd: root,
				prompt:
					"OPENAGENTSBTW_ROUTE=implement\nOPENAGENTSBTW_CONTRACT=edit-required",
				last_assistant_message: "Implemented src.ts and verified the change.",
				transcript_path: transcriptPath,
			});
			assert.equal(result.stdout, "");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("blocks execution-required completions without execution evidence", async () => {
		const root = await initRepo();
		try {
			const result = await invokeHook(root, {
				cwd: root,
				prompt:
					"OPENAGENTSBTW_ROUTE=qa\nOPENAGENTSBTW_CONTRACT=execution-required",
				last_assistant_message: "I would run the test suite next.",
			});
			const payload = JSON.parse(result.stdout);
			assert.equal(payload.continue, false);
			assert.match(payload.systemMessage, /execution evidence was not found/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("allows execution-required completions with transcript evidence", async () => {
		const root = await initRepo();
		try {
			const transcriptPath = path.join(root, "transcript.jsonl");
			await writeFile(
				transcriptPath,
				'{"tool_name":"Bash","stdout":"PASS\\ncommand: bun test"}\n',
			);
			const result = await invokeHook(root, {
				cwd: root,
				prompt:
					"OPENAGENTSBTW_ROUTE=qa\nOPENAGENTSBTW_CONTRACT=execution-required",
				last_assistant_message: "PASS: bun test",
				transcript_path: transcriptPath,
			});
			assert.equal(result.stdout, "");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
