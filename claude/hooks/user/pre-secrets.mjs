#!/usr/bin/env node
import { closeSync, openSync } from "node:fs";
import { devNull } from "node:os";
import { basename } from "node:path";

try {
	closeSync(2);
	openSync(devNull, "w");
} catch {
	process.stderr.write = () => true;
}

const FORCE_PUSH_TO_MAIN =
	/git\s+push\b.*--force(?:-with-lease)?.*\b(?:main|master)\b|git\s+push\b.*\b(?:main|master)\b.*--force(?:-with-lease)?/i;
const AUTH_HEADER_ECHO =
	/\b(?:curl|wget)\b.*\s(?:-H|--header)\s.+(?:authorization|api-key)/i;
const BROAD_RM_RF =
	/\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(?:\/\s|~\/|"\$HOME"|\.\.?\s|\/\*)/i;
const CURL_UPLOAD =
	/\bcurl\b.*\s(?:-d\b|-F\b|-T\b|--data\b|--upload-file\b|--form\b)(?!.*(?:localhost|127\.0\.0\.1|0\.0\.0\.0))/i;
const LOCALHOST_FETCH = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/;

const DOC_EXTENSIONS = new Set([
	".md",
	".mdx",
	".txt",
	".json",
	".yaml",
	".yml",
	".toml",
]);
const SENSITIVE_EXTENSIONS = new Set([
	".pem",
	".p12",
	".pfx",
	".key",
	".keystore",
	".jks",
]);
const SENSITIVE_DIRS = [
	"/.ssh/",
	"/.gnupg/",
	"/.aws/",
	"/.azure/",
	"/.gcloud/",
	"/.config/gcloud/",
];

function respond(decision, reason) {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: decision,
				permissionDecisionReason: reason,
			},
		}) + "\n",
	);
	process.exit(0);
}

function readStdin() {
	return new Promise((resolve) => {
		let buf = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			buf += chunk;
		});
		process.stdin.on("end", () => {
			try {
				resolve(JSON.parse(buf));
			} catch {
				resolve({});
			}
		});
		process.stdin.on("error", () => resolve({}));
		process.stdin.resume();
	});
}

function isSensitiveFile(filepath) {
	const base = basename(filepath);
	if (
		base === ".env" ||
		(base.startsWith(".env.") && !base.endsWith(".example"))
	)
		return true;
	const ext = `.${filepath.split(".").pop()}`;
	if (SENSITIVE_EXTENSIONS.has(ext)) return true;
	return SENSITIVE_DIRS.some((d) => filepath.includes(d));
}

(async () => {
	try {
		const data = await readStdin();
		const toolName = data.tool_name ?? "";
		const toolInput = data.tool_input ?? {};

		if (toolName === "Bash") {
			const cmd = toolInput.command ?? "";
			if (AUTH_HEADER_ECHO.test(cmd))
				respond("deny", "Blocked: command would echo auth headers to output.");
			if (FORCE_PUSH_TO_MAIN.test(cmd))
				respond(
					"deny",
					"Blocked: force-push to main/master is never allowed. Use a feature branch.",
				);
			if (BROAD_RM_RF.test(cmd))
				respond(
					"deny",
					"Blocked: rm -rf on broad path. Be more specific about what to delete.",
				);
			if (CURL_UPLOAD.test(cmd))
				respond(
					"deny",
					"Blocked: curl with data upload to external host. Use localhost or ask user.",
				);
		} else if (toolName === "Read") {
			const fp = toolInput.file_path ?? "";
			if (isSensitiveFile(fp))
				respond("deny", "Blocked: sensitive file reads are not permitted.");
			const ext = `.${fp.split(".").pop()}`;
			if (DOC_EXTENSIONS.has(ext))
				respond("allow", "Documentation/config read auto-approved");
		} else if (
			["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(toolName)
		) {
			const fp = toolInput.file_path ?? "";
			if (isSensitiveFile(fp))
				respond("deny", "Blocked: sensitive file writes are not permitted.");
		} else if (toolName === "WebFetch") {
			const url = toolInput.url ?? "";
			if (LOCALHOST_FETCH.test(url))
				respond(
					"deny",
					"Blocked: fetching from localhost services. Use Bash with curl instead.",
				);
		}

		process.exit(0);
	} catch {
		process.exit(0);
	}
})();
