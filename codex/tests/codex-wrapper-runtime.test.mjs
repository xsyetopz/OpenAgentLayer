import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { renderCodexWrapper } from "../../scripts/generate/render/codex-wrapper.mjs";
import {
	prependBinToPath,
	writeExecutableSync,
} from "../../tests/support/fake-command.mjs";

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

describe("generated codex wrapper", () => {
	const testFn = process.platform === "win32" ? it.skip : it;

	testFn("runs modes with and without config args under nounset", async () => {
		const tmp = await mkdtemp(path.join(os.tmpdir(), "oabtw-codex-wrapper-"));
		try {
			const binDir = path.join(tmp, "bin");
			await mkdir(binDir, { recursive: true });

			const wrapperPath = path.join(tmp, "oabtw-codex");
			await writeFile(
				wrapperPath,
				renderCodexWrapper("oabtw-codex", [
					{
						mode: "orchestrate",
						profile: "openagentsbtw",
						routeKind: "edit-required",
						prompt: "orchestrate prompt",
					},
					{
						mode: "implement",
						profile: "openagentsbtw-implement",
						routeKind: "edit-required",
						prompt: "implement prompt",
					},
				]),
			);
			await chmod(wrapperPath, 0o755);

			const nodeStub = writeExecutableSync(binDir, "node", {
				unix: `#!/bin/bash
set -euo pipefail
printf '%s\\n' "$@"
`,
				windows: "@echo off\r\n",
			});
			await chmod(nodeStub, 0o755);

			const env = { PATH: prependBinToPath(binDir, process.env.PATH ?? "") };

			const orchestrate = await run(wrapperPath, ["orchestrate", "fix stars"], {
				env,
			});
			assert.equal(orchestrate.code, 0);
			assert.match(orchestrate.stdout, /run-codex-filtered\.mjs$/m);
			assert.match(orchestrate.stdout, /^exec$/m);
			assert.match(orchestrate.stdout, /^--profile$/m);
			assert.match(orchestrate.stdout, /^openagentsbtw$/m);
			assert.match(orchestrate.stdout, /^OPENAGENTSBTW_ROUTE=orchestrate$/m);
			assert.match(
				orchestrate.stdout,
				/^OPENAGENTSBTW_CONTRACT=edit-required$/m,
			);

			const fast = await run(
				wrapperPath,
				["implement", "--speed", "fast", "fix stars"],
				{
					env,
				},
			);
			assert.equal(fast.code, 0);
			assert.match(fast.stdout, /run-codex-filtered\.mjs$/m);
			assert.match(fast.stdout, /^-c$/m);
			assert.match(fast.stdout, /^features\.fast_mode = true$/m);
			assert.match(fast.stdout, /^service_tier = "fast"$/m);
			assert.match(fast.stdout, /^OPENAGENTSBTW_ROUTE=implement$/m);
			assert.match(fast.stdout, /^OPENAGENTSBTW_CONTRACT=edit-required$/m);
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});
});
