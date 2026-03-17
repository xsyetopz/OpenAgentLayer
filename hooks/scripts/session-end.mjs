#!/usr/bin/env node
import "./suppress-stderr.mjs";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditLog, passthrough, readStdin, warn } from "./_lib.mjs";

function cleanup() {
	const uid = process.getuid ? String(process.getuid()) : "unknown";
	const prefix = `cca-failures-${uid}-`;
	try {
		for (const entry of readdirSync(tmpdir())) {
			if (entry.startsWith(prefix) && entry.endsWith(".jsonl")) {
				try {
					unlinkSync(join(tmpdir(), entry));
				} catch {
					/* ignore */
				}
			}
		}
	} catch {
		// ignore
	}
}

function countAuditEntries() {
	const logDir = process.env.CCA_HOOK_LOG_DIR;
	if (!logDir) return 0;
	const logFile = join(logDir, "cca-hooks.jsonl");
	if (!existsSync(logFile)) return 0;
	try {
		return readFileSync(logFile, "utf8").split("\n").filter(Boolean).length;
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
