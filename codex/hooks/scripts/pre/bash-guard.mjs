#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { deny, passthrough, readStdin } from "../_lib.mjs";

const LARGE_OUTPUT_RULES = [
	[
		/\bcat\b.*\.(log|lock|jsonl|csv|sql|txt)\b/i,
		"Use `tail -n 200` or `rg` instead of dumping large files into context.",
	],
	[
		/\bfind\b\s+\.(?:\s+\S+)*$/m,
		"Unbounded `find .` is noisy. Add `-maxdepth`, `-name`, or pipe to `head`.",
	],
];

const DNS_EXFIL = /\b(ping|nslookup|dig|traceroute|host|drill)\b/;
const BLANKET_STAGE = /\bgit\s+add\s+(?:\.\s*$|-A\b)/m;
const BROAD_RM =
	/\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(?:\/\s|~\/|"\$HOME"|\.\.?\s|\/\*)/;
const CO_AUTHOR_TRAILER_RE = /Co-Authored-By:\s*([^\n<]+?)\s*<([^>\n]+)>/gi;
const MALFORMED_CANONICAL_EMAILS = new Map([
	["noreply@openai", "noreply@openai.com"],
	["noreply@anthropic", "noreply@anthropic.com"],
]);
const CODEX_DEFAULT_TRAILER = "Co-Authored-By: Codex <noreply@openai.com>";

function splitTopLevelSegments(command) {
	const segments = [];
	let current = "";
	let quote = "";
	let escape = false;
	for (let i = 0; i < command.length; i += 1) {
		const char = command[i];
		const next = command[i + 1] || "";
		if (escape) {
			current += char;
			escape = false;
			continue;
		}
		if (char === "\\") {
			current += char;
			escape = true;
			continue;
		}
		if (quote) {
			current += char;
			if (char === quote) quote = "";
			continue;
		}
		if (char === "'" || char === '"') {
			current += char;
			quote = char;
			continue;
		}
		if ((char === "&" && next === "&") || (char === "|" && next === "|")) {
			if (current.trim()) segments.push(current.trim());
			current = "";
			i += 1;
			continue;
		}
		if (char === ";" || char === "|") {
			if (current.trim()) segments.push(current.trim());
			current = "";
			continue;
		}
		current += char;
	}
	if (current.trim()) segments.push(current.trim());
	return segments;
}

function summarizeCommand(command) {
	const singleLine = command.replace(/\s+/g, " ").trim();
	return singleLine.length > 180
		? `${singleLine.slice(0, 177)}...`
		: singleLine;
}

function denyForCommand(reason, command) {
	deny(`${reason}\nCommand: ${summarizeCommand(command)}`);
}

function getStagedFiles() {
	try {
		const result = spawnSync("git", ["diff", "--cached", "--name-only"], {
			encoding: "utf8",
			timeout: 5000,
		});
		return result.stdout.trim().split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

function stagedEnvFile(files) {
	for (const file of files) {
		const basename = file.split("/").pop() || "";
		if (
			basename === ".env" ||
			(basename.startsWith(".env.") && !basename.endsWith(".example"))
		) {
			return file;
		}
		try {
			const content = readFileSync(file, "utf8");
			if (/^(?:<{7}|={7}|>{7})\s/m.test(content)) {
				return `${file} (merge conflict markers)`;
			}
		} catch {
			// Ignore unreadable staged paths.
		}
	}
	return null;
}

function checkLargeOutput(command) {
	let diffPreflightSeen = false;
	for (const segment of splitTopLevelSegments(command)) {
		if (/\bgit\s+diff\b/.test(segment)) {
			if (segment.includes("--stat") || segment.includes("--name-only")) {
				diffPreflightSeen = true;
				continue;
			}
			if (!diffPreflightSeen) {
				return {
					message: "Use `git diff --stat` or `git diff --name-only` first.",
					command: segment,
				};
			}
		}
		for (const [pattern, message] of LARGE_OUTPUT_RULES) {
			if (pattern.test(segment)) return { message, command: segment };
		}
	}
	return null;
}

function shellQuote(value) {
	return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function malformedTrailerEmail(command) {
	for (const match of command.matchAll(CO_AUTHOR_TRAILER_RE)) {
		const email = String(match[2] || "")
			.trim()
			.toLowerCase();
		const fixed = MALFORMED_CANONICAL_EMAILS.get(email);
		if (fixed) {
			return { invalid: email, fixed };
		}
	}
	return null;
}

function hasCoAuthorTrailer(command) {
	return /Co-Authored-By:/i.test(command);
}

function withDefaultCodexTrailer(command) {
	return `${command} --trailer ${shellQuote(CODEX_DEFAULT_TRAILER)}`;
}

(async () => {
	const data = await readStdin();
	if (data.tool_name !== "Bash") passthrough();

	const command = (data.tool_input?.command || "").trim();
	if (!command) passthrough();

	const largeOutput = checkLargeOutput(command);
	if (largeOutput) {
		denyForCommand(
			`[openagentsbtw:guard] ${largeOutput.message}`,
			largeOutput.command,
		);
	}
	if (BLANKET_STAGE.test(command)) {
		denyForCommand(
			"Use `git add <specific files>` so staging stays reviewable.",
			command,
		);
	}
	if (BROAD_RM.test(command)) {
		denyForCommand("Blocked broad `rm -rf`. Narrow the target path.", command);
	}
	if (DNS_EXFIL.test(command)) {
		denyForCommand(
			"Blocked DNS or ICMP networking tool. Use `curl` or a safer check instead.",
			command,
		);
	}

	if (/\bgit\s+commit\b/.test(command)) {
		const stagedIssue = stagedEnvFile(getStagedFiles());
		if (stagedIssue) {
			denyForCommand(
				`Commit blocked because staged content looks unsafe: ${stagedIssue}`,
				command,
			);
		}
		const malformed = malformedTrailerEmail(command);
		if (malformed) {
			denyForCommand(
				`Malformed Co-Authored-By trailer email: ${malformed.invalid}. Use ${malformed.fixed}.`,
				command,
			);
		}
		if (!hasCoAuthorTrailer(command)) {
			denyForCommand(
				`Co-Authored-By trailer is required for AI-authored commits. Use: ${withDefaultCodexTrailer(command)}`,
				command,
			);
		}
	}

	passthrough();
})();
