#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
if (!args.length) {
	process.stderr.write("Usage: run-codex-filtered.mjs <codex args...>\n");
	process.exit(1);
}

const filterEnabled = process.env.OABTW_CODEX_FILTER_TUI_HOOK_NOISE !== "0";
const HOOK_LINE_PATTERNS = [
	/^\s*[•*]?\s*(?:UserPromptSubmit|SessionStart|PreToolUse|PostToolUse|Stop) hook \((?:completed|running|failed|blocked|stopped)\)\s*$/u,
	/^\s*hook:\s*(?:UserPromptSubmit|SessionStart|PreToolUse|PostToolUse|Stop)(?:\s+(?:Completed|Running|Failed|Blocked|Stopped))?\s*$/u,
	/^\s*hook context:\s*/u,
];
const WARNING_LINE_PATTERNS = [/^\s*warning:/iu, /^\s*error:/iu];

function shouldDropLine(line) {
	if (!filterEnabled) return false;
	if (!line.trim()) return false;
	return HOOK_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function pipeStream(stream, sink) {
	let buffer = "";
	let droppingHookContext = false;
	stream.setEncoding("utf8");
	stream.on("data", (chunk) => {
		buffer += chunk;
		const lines = buffer.split(/\r?\n/u);
		buffer = lines.pop() ?? "";
		for (const line of lines) {
			if (droppingHookContext) {
				if (!line.trim()) {
					droppingHookContext = false;
				} else if (
					WARNING_LINE_PATTERNS.some((pattern) => pattern.test(line))
				) {
					droppingHookContext = false;
					sink.write(`${line}\n`);
				}
				continue;
			}
			if (/^\s*hook context:\s*/u.test(line)) {
				droppingHookContext = filterEnabled;
				continue;
			}
			if (!shouldDropLine(line)) {
				sink.write(`${line}\n`);
			}
		}
	});
	stream.on("end", () => {
		if (droppingHookContext) return;
		if (buffer && !shouldDropLine(buffer)) {
			sink.write(buffer);
		}
	});
}

const child = spawn("codex", args, {
	stdio: ["inherit", "pipe", "pipe"],
	env: process.env,
	shell: process.platform === "win32",
});

pipeStream(child.stdout, process.stdout);
pipeStream(child.stderr, process.stderr);

child.on("error", (error) => {
	process.stderr.write(`${String(error)}\n`);
	process.exit(1);
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 1);
});
