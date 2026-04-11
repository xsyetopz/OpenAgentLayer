import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { renderCodexPeerWrapper } from "../../scripts/generate/render/codex-peer-wrapper.mjs";

function run(command, args, { cwd, env = {} } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env: { ...process.env, ...env },
			stdio: ["ignore", "pipe", "pipe"],
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
		child.on("exit", (code) => {
			resolve({ code: code ?? 1, stdout, stderr });
		});
	});
}

describe("generated codex peer wrapper", () => {
	it("prints help without exploding on empty optional args", { skip: process.platform === "win32" && "peer wrapper is a Bash script" }, async () => {
		const tmp = await mkdtemp(path.join(os.tmpdir(), "oabtw-peer-help-"));
		try {
			const wrapperPath = path.join(tmp, "oabtw-codex-peer");
			const hookRoot = path.join(
				tmp,
				".codex",
				"openagentsbtw",
				"hooks",
				"scripts",
				"session",
			);
			await writeFile(wrapperPath, renderCodexPeerWrapper("oabtw-codex-peer"));
			await chmod(wrapperPath, 0o755);
			await mkdirRecursive(hookRoot);
			await writeFile(
				path.join(hookRoot, "peer-run.mjs"),
				"process.stdout.write(JSON.stringify(process.argv.slice(2)) + '\\n');\n",
			);

			const topHelp = await run(wrapperPath, ["--help"], {
				env: { HOME: tmp },
			});
			assert.equal(topHelp.code, 0);
			assert.match(topHelp.stderr, /Usage: oabtw-codex-peer <batch\|tmux>/);

			const modeHelp = await run(wrapperPath, ["batch", "--help"], {
				env: { HOME: tmp },
			});
			assert.equal(modeHelp.code, 0);
			assert.match(modeHelp.stderr, /Usage: oabtw-codex-peer <batch\|tmux>/);

			const dryRun = await run(
				wrapperPath,
				["batch", "--dry-run", "fix stars"],
				{ env: { HOME: tmp } },
			);
			assert.equal(dryRun.code, 0);
			assert.equal(
				dryRun.stdout.trim(),
				JSON.stringify(["batch", "--dry-run", "fix stars"]),
			);
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});
});

async function mkdirRecursive(dir) {
	const { mkdir } = await import("node:fs/promises");
	await mkdir(dir, { recursive: true });
}
