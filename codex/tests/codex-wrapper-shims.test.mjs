import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
	renderCodexWrapperCmd,
	renderCodexWrapperPs1,
} from "../../scripts/install/codex-wrapper-shims.mjs";
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

describe("managed codex wrapper shims", () => {
	it("renders cmd shim that delegates to the paired PowerShell shim", () => {
		assert.equal(
			renderCodexWrapperCmd("oabtw-codex"),
			'@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0oabtw-codex.ps1" %*',
		);
	});

	it("renders a PowerShell shim that shells out through bash", () => {
		const rendered = renderCodexWrapperPs1("oabtw-codex");
		assert.match(rendered, /^\$bash = Get-Command bash/m);
		assert.match(rendered, /oabtw-codex"/);
		assert.match(rendered, /@args/);
	});

	const testFn = process.platform === "win32" ? it : it.skip;
	testFn(
		"executes the Windows cmd and PowerShell shims through the managed bash bridge",
		async () => {
			const tmp = await mkdtemp(path.join(os.tmpdir(), "oabtw-codex-shims-"));
			try {
				const binDir = path.join(tmp, "bin");
				const shimDir = path.join(tmp, "shim");
				await mkdir(binDir, { recursive: true });
				await mkdir(shimDir, { recursive: true });

				await writeFile(
					path.join(shimDir, "oabtw-codex.ps1"),
					renderCodexWrapperPs1("oabtw-codex"),
				);
				await writeFile(
					path.join(shimDir, "oabtw-codex.cmd"),
					renderCodexWrapperCmd("oabtw-codex"),
				);
				await writeFile(path.join(shimDir, "oabtw-codex"), "#!/bin/bash\n");
				await chmod(path.join(shimDir, "oabtw-codex"), 0o755);

				writeExecutableSync(binDir, "bash", {
					unix: "#!/bin/sh\nexit 1\n",
					windows: "@echo off\r\nshift\r\necho %*\r\nexit /b 0\r\n",
				});

				const result = await run(
					path.join(shimDir, "oabtw-codex.cmd"),
					["resume", "--last"],
					{
						env: {
							...process.env,
							PATH: prependBinToPath(binDir, process.env.PATH ?? ""),
						},
					},
				);
				assert.equal(result.code, 0);
				assert.match(
					result.stdout.replace(/\r/g, ""),
					/oabtw-codex resume --last/,
				);
			} finally {
				await rm(tmp, { recursive: true, force: true });
			}
		},
	);
});
