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
		/\bgit\s+diff\b(?!.*--stat)(?!.*--name-only)/,
		"Use `git diff --stat` or `git diff --name-only` first.",
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
	for (const [pattern, message] of LARGE_OUTPUT_RULES) {
		if (pattern.test(command)) return message;
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
	if (largeOutput) deny(`[openagentsbtw:guard] ${largeOutput}`);
	if (BLANKET_STAGE.test(command)) {
		deny("Use `git add <specific files>` so staging stays reviewable.");
	}
	if (BROAD_RM.test(command)) {
		deny("Blocked broad `rm -rf`. Narrow the target path.");
	}
	if (DNS_EXFIL.test(command)) {
		deny(
			"Blocked DNS or ICMP networking tool. Use `curl` or a safer check instead.",
		);
	}

	if (/\bgit\s+commit\b/.test(command)) {
		const stagedIssue = stagedEnvFile(getStagedFiles());
		if (stagedIssue) {
			deny(
				`Commit blocked because staged content looks unsafe: ${stagedIssue}`,
			);
		}
		const malformed = malformedTrailerEmail(command);
		if (malformed) {
			deny(
				`Malformed Co-Authored-By trailer email: ${malformed.invalid}. Use ${malformed.fixed}.`,
			);
		}
		if (!hasCoAuthorTrailer(command)) {
			deny(
				`Co-Authored-By trailer is required for AI-authored commits. Use: ${withDefaultCodexTrailer(command)}`,
			);
		}
	}

	passthrough();
})();
