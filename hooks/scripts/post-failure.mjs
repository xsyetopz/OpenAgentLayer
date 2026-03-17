#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
	closeSync,
	existsSync,
	openSync,
	readFileSync,
	writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditLog, passthrough, readStdin, warn } from "./_lib.mjs";

const MAX_CONSECUTIVE = 3;

function failureLogPath() {
	const uid = process.getuid ? String(process.getuid()) : "unknown";
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
		for (const line of lines.slice(-10).reverse()) {
			const entry = JSON.parse(line);
			if (entry.tool === toolName) count++;
			else break;
		}
	} catch {
		// ignore
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
		const content = lines.map((l) => `${l}\n`).join("") + newEntry;
		const fd = openSync(logPath, "w", 0o600);
		writeSync(fd, content);
		closeSync(fd);
	} catch {
		// ignore
	}
}

const data = readStdin();
const toolName = data.tool_name ?? "unknown";
const error = data.tool_error ?? data.error ?? "";

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
	warn(
		`Tool '${toolName}' has failed ${consecutive} times consecutively. ` +
			`Stop retrying the same approach. Consider: ` +
			`(1) a different tool, (2) a different approach, (3) asking the user for guidance.`,
		"PostToolUseFailure",
	);
} else {
	passthrough();
}
