#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditLog, genericWarn, passthrough, readStdin } from "../_lib.mjs";

const MAX_CONSECUTIVE = 3;

function failureLogPath() {
	const uid = String(process.getuid());
	const cwdHash = createHash("sha256")
		.update(process.cwd())
		.digest("hex")
		.slice(0, 12);
	return join(tmpdir(), `cca-failures-${uid}-${cwdHash}.jsonl`);
}

function getRecentFailures(toolName) {
	const logPath = failureLogPath();
	if (!existsSync(logPath)) return 0;
	let count = 0;
	try {
		const lines = readFileSync(logPath, "utf8").split("\n").filter(Boolean);
		const recent = lines.slice(-10).reverse();
		for (const line of recent) {
			const entry = JSON.parse(line.trim());
			if (entry.tool === toolName) {
				count++;
			} else {
				break;
			}
		}
	} catch {
		// best-effort
	}
	return count;
}

function logFailure(toolName, error) {
	const logPath = failureLogPath();
	try {
		let lines = [];
		if (existsSync(logPath)) {
			lines = readFileSync(logPath, "utf8")
				.split("\n")
				.filter(Boolean)
				.slice(-49);
		}
		const newEntry =
			JSON.stringify({ tool: toolName, error: String(error).slice(0, 200) }) +
			"\n";
		writeFileSync(
			logPath,
			lines.join("\n") + (lines.length ? "\n" : "") + newEntry,
			{ mode: 0o600 },
		);
	} catch {
		// best-effort
	}
}

(async () => {
	try {
		const data = await readStdin();
		const toolName = data.tool_name || "unknown";
		const error = data.tool_error || data.error || "";

		logFailure(toolName, String(error));
		auditLog(
			"PostToolUseFailure",
			"post-failure.mjs",
			"logged",
			String(error).slice(0, 200),
			toolName,
		);

		const consecutive = getRecentFailures(toolName);
		if (consecutive >= MAX_CONSECUTIVE) {
			genericWarn(
				`Tool '${toolName}' has failed ${consecutive} times consecutively. ` +
					`Stop retrying the same approach. Consider: ` +
					`(1) a different tool, (2) a different approach, (3) asking the user for constraints/clarification. ` +
					`Keep tone neutral (no urgency/pressure). Do not game tests, weaken requirements, hide failures, switch into tutorial mode, or leave core work undone just because the interaction feels stressed.`,
			);
		} else {
			passthrough();
		}
	} catch {
		passthrough();
	}
})();
