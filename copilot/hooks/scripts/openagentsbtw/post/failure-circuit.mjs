#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	passthrough,
	readStdin,
	resolveCwd,
	resolveToolName,
	systemMessage,
} from "../_lib.mjs";

const MAX_CONSECUTIVE = 3;

function failureLogPath(cwd) {
	const uid = process.getuid ? String(process.getuid()) : "nouid";
	const cwdHash = createHash("sha256")
		.update(String(cwd))
		.digest("hex")
		.slice(0, 12);
	return join(
		tmpdir(),
		`openagentsbtw-copilot-failures-${uid}-${cwdHash}.jsonl`,
	);
}

function isFailure(payload) {
	const error = payload.tool_error || payload.toolError || payload.error || "";
	if (error) return true;

	const response =
		payload.tool_response || payload.toolResponse || payload.toolResult || null;
	if (!response) return false;

	if (typeof response === "object") {
		const exitCode =
			response.exitCode ??
			response.exit_code ??
			response.status ??
			response.code ??
			null;
		return typeof exitCode === "number" && exitCode !== 0;
	}

	return false;
}

function getRecentFailures(logPath, toolName) {
	if (!existsSync(logPath)) return 0;
	try {
		const lines = readFileSync(logPath, "utf8").split("\n").filter(Boolean);
		const recent = lines.slice(-10).reverse();
		let count = 0;
		for (const line of recent) {
			const entry = JSON.parse(line.trim());
			if (entry.tool === toolName) count++;
			else break;
		}
		return count;
	} catch {
		return 0;
	}
}

function logFailure(logPath, toolName, error) {
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
	const data = await readStdin();
	if (!data || !Object.keys(data).length) passthrough();
	if (!isFailure(data)) passthrough();

	const cwd = resolveCwd(data);
	const toolName = resolveToolName(data) || "unknown";
	const logPath = failureLogPath(cwd);
	const error =
		data.tool_error || data.toolError || data.error || "tool execution failed";
	logFailure(logPath, toolName, error);

	const consecutive = getRecentFailures(logPath, toolName);
	if (consecutive < MAX_CONSECUTIVE) passthrough();

	systemMessage(
		[
			`[openagentsbtw:fail] Tool '${toolName}' failed ${consecutive} times consecutively.`,
			"Stop retrying the same approach. Prefer: (1) a different tool, (2) a different approach, or (3) asking the user for constraints/clarification.",
			"Do not game tests, weaken requirements, or hide failures to make the run “pass”.",
		].join(" "),
	);
})();
