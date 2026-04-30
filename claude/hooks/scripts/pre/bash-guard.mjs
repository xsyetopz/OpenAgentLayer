#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
	allow,
	deny,
	HOOK_STRICT,
	isMetaFile,
	isTestFile,
	MERGE_CONFLICT,
	matchPlaceholders,
	matchSecrets,
	passthrough,
	readStdin,
} from "../_lib.mjs";

const LARGE_OUTPUT_RULES = [
	[
		/\bcat\b.*\.(log|lock|jsonl|csv|sql|txt)\b/i,
		"Use `tail -n 200` or `grep` instead of catting large files into context.",
	],
	[
		/\bgit\s+diff\b(?!.*--stat)(?!.*--name)(?!.*HEAD\s+HEAD)/,
		"Use `git diff --stat` or `git diff --name-only` first.",
	],
	[
		/\bgrep\b\s+-[a-zA-Z]*[rR][a-zA-Z]*\s+["']?[^"'\s]+["']?\s+\.$/,
		"Unbounded `grep -r ... .` dumps everything. Add --include or pipe to head.",
	],
	[
		/\bfind\b\s+\.(?:\s+\S+)*\s*$(?!.*-maxdepth)(?!.*\|\s*head)(?!.*\|\s*wc)/m,
		"Unbounded `find .` returns thousands of lines. Add -maxdepth or pipe to head.",
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
const CLAUDE_DEFAULT_TRAILER = "Co-Authored-By: Claude <noreply@anthropic.com>";

function getStagedFiles() {
	try {
		const result = spawnSync("git", ["diff", "--cached", "--name-only"], {
			encoding: "utf8",
			timeout: 10000,
		});
		return result.stdout
			.trim()
			.split("\n")
			.filter((f) => f.length > 0);
	} catch {
		return [];
	}
}

function fileIssues(filepath) {
	const blockers = [];
	const warnings = [];
	try {
		readFileSync(filepath); // existence check
	} catch {
		return { blockers, warnings };
	}

	const basename = filepath.split("/").pop();
	if (
		basename === ".env" ||
		(basename.startsWith(".env.") && !basename.endsWith(".example"))
	) {
		blockers.push(`.env file staged: ${filepath}`);
		return { blockers, warnings };
	}

	let content;
	try {
		content = readFileSync(filepath, "utf8");
	} catch {
		return { blockers, warnings };
	}

	if (MERGE_CONFLICT.test(content)) {
		blockers.push(`Merge conflict markers in ${filepath}`);
	}

	if (!isTestFile(filepath)) {
		const lines = content.split("\n");
		const { hard } = matchPlaceholders(filepath, lines, {
			includeEmptyBody: true,
		});
		if (hard.length > 0) {
			blockers.push(`Placeholder in ${filepath}`);
		}
	}

	if (isMetaFile(filepath) || isTestFile(filepath))
		return { blockers, warnings };

	// Per-line secret scanning with context
	const lines = content.split("\n");
	const secretHits = matchSecrets(filepath, lines);
	for (const hit of secretHits) {
		const msg = `Possible secret in ${hit.file}:${hit.line}: ${hit.text}`;
		if (HOOK_STRICT) {
			blockers.push(msg);
		} else {
			warnings.push(msg);
		}
	}
	return { blockers, warnings };
}

function checkLargeOutput(cmd) {
	for (const [pattern, message] of LARGE_OUTPUT_RULES) {
		if (pattern.test(cmd)) return message;
	}
	return null;
}

function forbiddenGitAdd(cmd) {
	return BLANKET_STAGE.test(cmd);
}

function forbiddenRm(cmd) {
	return BROAD_RM.test(cmd);
}

function precommitCheck(cmd) {
	if (!/\bgit\s+commit\b(?!-tree)/.test(cmd))
		return { blockers: [], warnings: [] };
	const staged = getStagedFiles();
	const allBlockers = [];
	const allWarnings = [];
	for (const filepath of staged) {
		const { blockers, warnings } = fileIssues(filepath);
		allBlockers.push(...blockers);
		allWarnings.push(...warnings);
	}
	return { blockers: allBlockers, warnings: allWarnings };
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

function withDefaultClaudeTrailer(command) {
	return `${command} --trailer ${shellQuote(CLAUDE_DEFAULT_TRAILER)}`;
}

(async () => {
	try {
		const data = await readStdin();
		if (!data || data.tool_name !== "Bash") passthrough();

		const command = (data.tool_input?.command ?? "").trim();

		const largeOutputMsg = checkLargeOutput(command);
		if (largeOutputMsg) deny(`[guard] ${largeOutputMsg}`);

		if (forbiddenGitAdd(command))
			deny("Use `git add <specific files>` - review what you're staging.");

		if (forbiddenRm(command))
			deny("Blocked: rm -rf on broad path. Be more specific.");

		const { blockers, warnings } = precommitCheck(command);
		if (warnings.length > 0) {
			process.stderr.write(
				"[cca:guard] Warnings:\n" +
					warnings
						.slice(0, 10)
						.map((w) => `  - ${w}`)
						.join("\n") +
					"\n",
			);
		}
		if (blockers.length > 0) {
			deny(
				"Pre-commit checks failed:\n" +
					blockers
						.slice(0, 10)
						.map((b) => `  - ${b}`)
						.join("\n") +
					"\nFix these issues before committing.",
			);
		}

		if (/\bgit\s+commit\b(?!-tree)/.test(command)) {
			const malformed = malformedTrailerEmail(command);
			if (malformed) {
				deny(
					`Malformed Co-Authored-By trailer email: ${malformed.invalid}. Use ${malformed.fixed}.`,
				);
			}
			if (!hasCoAuthorTrailer(command)) {
				allow("Added canonical AI Co-Authored-By trailer.", "PreToolUse", {
					...data.tool_input,
					command: withDefaultClaudeTrailer(command),
				});
			}
		}

		if (DNS_EXFIL.test(command)) {
			deny(
				"[guard] DNS/ICMP tools can exfiltrate data (CVE-2025-55284). Use curl for connectivity checks.",
			);
		}

		passthrough();
	} catch {
		passthrough();
	}
})();
