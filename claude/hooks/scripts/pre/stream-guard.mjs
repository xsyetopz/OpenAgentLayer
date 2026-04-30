#!/usr/bin/env node
/**
 * Stream Guard -- PreToolUse hook (Layer 1)
 *
 * When CCA_STREAM_MODE=1, blocks commands and file operations that would
 * expose secrets during livestreams. No-op when streaming mode is off.
 *
 * Fires on: Bash, Read, Write, Edit
 */
import "../suppress-stderr.mjs";
import {
	isStreamMode,
	loadSecrets,
	loadStreamGuardConfig,
} from "../_env-loader.mjs";
import { deny, passthrough, readStdin, SECRET_PATTERNS } from "../_lib.mjs";

const ENV_DUMP_RE =
	/(?:^|\||&&|;)\s*(?:env|printenv|export\s+-p|declare\s+-p)\s*(?:$|\||&|;|>)/;

const ENV_FILE_RE = /\.env(?:\.\w+)?(?:\s|$|["'])/;

const CAT_ENV_RE = /\b(?:cat|head|tail|less|more|bat|view)\b.*\.env/;

const SOURCE_ENV_RE = /(?:^|\s)(?:source|\.)(?:\s+).*\.env/;

const ECHO_SECRET_RE =
	/\becho\b.*\$\{?\s*(?:SECRET|PASSWORD|TOKEN|API_?KEY|AUTH|PRIVATE|CREDENTIAL|DB_PASS)/i;

const GREP_ENV_RE = /\b(?:grep|rg|ag|egrep|fgrep|ack)\b.*\.env/;

const INTERPRETER_ENV_RE =
	/\b(?:node\s+-e|python[3]?\s+-c|ruby\s+-e|perl\s+-e)\b.*\.env/;

const UTILITY_ENV_RE =
	/\b(?:awk|sed|cut|sort|tr|wc|tee|xargs|strings)\b.*\.env/;

const SENSITIVE_FILE_RE =
	/(?:credentials\.json|\.pem|\.key|\.keystore|\.jks|\.p12|\.pfx|id_rsa|id_ed25519|\.bunrc|\.pypirc)\b/;

function checkBashCommand(command, envValues) {
	if (ENV_DUMP_RE.test(command)) {
		return "Stream guard: blocked environment variable dump (env/printenv/export -p)";
	}
	if (CAT_ENV_RE.test(command)) {
		return "Stream guard: blocked reading .env file contents";
	}
	if (SOURCE_ENV_RE.test(command)) {
		return "Stream guard: blocked sourcing .env file";
	}
	if (ECHO_SECRET_RE.test(command)) {
		return "Stream guard: blocked echoing secret variable";
	}
	if (GREP_ENV_RE.test(command)) {
		return "Stream guard: blocked searching .env files";
	}
	if (INTERPRETER_ENV_RE.test(command)) {
		return "Stream guard: blocked interpreter accessing .env files";
	}
	if (UTILITY_ENV_RE.test(command)) {
		return "Stream guard: blocked utility processing .env files";
	}

	// Exact-value match: check if any loaded secret value appears in the command
	for (const secret of envValues) {
		if (command.includes(secret)) {
			return "Stream guard: blocked command containing secret value from .env";
		}
	}

	// Pattern match: check for known secret formats in the command
	for (const pat of SECRET_PATTERNS) {
		if (pat.test(command)) {
			return "Stream guard: blocked command containing secret pattern";
		}
	}

	return null;
}

function checkFilePath(filepath) {
	if (!filepath) return null;

	if (ENV_FILE_RE.test(filepath) || /\.env$/.test(filepath)) {
		return "Stream guard: blocked access to .env file";
	}
	if (SENSITIVE_FILE_RE.test(filepath)) {
		return "Stream guard: blocked access to sensitive credential file";
	}
	return null;
}

(async () => {
	try {
		if (!isStreamMode()) passthrough();

		const data = await readStdin();
		if (!data || !data.tool_name) passthrough();

		const config = loadStreamGuardConfig();
		if (!config.enabled) passthrough();

		const { values } = loadSecrets({
			envFiles: config.envFiles,
			minSecretLength: config.minSecretLength,
			safeEnvPrefixes: config.safeEnvPrefixes,
		});

		const tool = data.tool_name;
		const input = data.tool_input || {};

		if (tool === "Bash") {
			const cmd = input.command || "";
			const reason = checkBashCommand(cmd, values);
			if (reason) deny(reason);
		}

		if (tool === "Read") {
			const reason = checkFilePath(input.file_path || "");
			if (reason) deny(reason);
		}

		if (tool === "Write" || tool === "Edit" || tool === "MultiEdit") {
			// Check if writing TO a sensitive file (less common but worth guarding)
			const reason = checkFilePath(input.file_path || "");
			if (reason) deny(reason);

			// Check if content being written contains secrets
			const content = input.content || input.new_string || "";
			if (content) {
				for (const secret of values) {
					if (content.includes(secret)) {
						deny(
							"Stream guard: blocked write containing secret value from .env",
						);
					}
				}
			}
		}

		passthrough();
	} catch {
		passthrough();
	}
})();
