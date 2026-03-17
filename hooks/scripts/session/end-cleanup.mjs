#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditLog, passthrough, readStdin, warn } from "../_lib.mjs";

function cleanup() {
	const uid = process.getuid ? String(process.getuid()) : "0";
	const tmp = tmpdir();
	let entries;
	try {
		entries = readdirSync(tmp);
	} catch {
		return;
	}
	for (const name of entries) {
		if (name.startsWith(`cca-failures-${uid}-`) && name.endsWith(".jsonl")) {
			try {
				unlinkSync(join(tmp, name));
			} catch {
				// suppress OSError equivalent
			}
		}
	}
}

function countAuditEntries() {
	const logDir = process.env.CCA_HOOK_LOG_DIR;
	if (!logDir) return 0;
	const logFile = join(logDir, "cca-hooks.jsonl");
	if (!existsSync(logFile)) return 0;
	try {
		const content = readFileSync(logFile, "utf8");
		return content.split("\n").filter((line) => line.trim().length > 0).length;
	} catch {
		return 0;
	}
}

(async () => {
	try {
		await readStdin();

		auditLog("SessionEnd", "session-end.mjs", "session_ended");
		cleanup();

		const entries = countAuditEntries();
		if (entries > 0) {
			warn(
				`Session ended. ${entries} hook events logged to $CCA_HOOK_LOG_DIR/cca-hooks.jsonl.`,
				"SessionEnd",
			);
		} else {
			passthrough();
		}
	} catch {
		passthrough();
	}
})();
