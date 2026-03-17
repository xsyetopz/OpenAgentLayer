#!/usr/bin/env node
import "./suppress-stderr.mjs";
import { spawnSync } from "node:child_process";
import { auditLog, passthrough, readStdin, warn } from "./_lib.mjs";

function getGitContext() {
	const parts = [];
	try {
		const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
			encoding: "utf8",
			timeout: 1000,
		});
		if (branch.status === 0 && branch.stdout.trim()) {
			parts.push(`Branch: ${branch.stdout.trim()}`);
		}

		const log = spawnSync("git", ["log", "--oneline", "-5", "--no-decorate"], {
			encoding: "utf8",
			timeout: 1000,
		});
		if (log.status === 0 && log.stdout.trim()) {
			parts.push(`Recent commits:\n${log.stdout.trim()}`);
		}

		const status = spawnSync("git", ["diff", "--stat", "--no-color", "HEAD"], {
			encoding: "utf8",
			timeout: 1000,
		});
		if (status.status === 0 && status.stdout.trim()) {
			parts.push(`Uncommitted changes:\n${status.stdout.trim()}`);
		}
	} catch {
		// ignore git errors
	}
	return parts.join("\n");
}

(async () => {
	try {
		const data = await readStdin();
		const prompt = data.prompt ?? "";

		if (!prompt.trim()) passthrough();

		auditLog("UserPromptSubmit", "user-prompt-submit.mjs", "processed");

		const gitCtx = getGitContext();
		if (gitCtx) {
			warn(`Git context:\n${gitCtx}`, "UserPromptSubmit");
		} else {
			passthrough();
		}
	} catch {
		passthrough();
	}
})();
