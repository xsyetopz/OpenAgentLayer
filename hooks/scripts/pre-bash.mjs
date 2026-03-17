#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import {
	deny,
	isTestFile,
	MERGE_CONFLICT,
	PLACEHOLDER_HARD,
	passthrough,
	readStdin,
	SECRET_PATTERNS,
} from "./_lib.mjs";

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

function getStagedFiles() {
	try {
		const result = spawnSync("git", ["diff", "--cached", "--name-only"], {
			encoding: "utf8",
			timeout: 10000,
		});
		return result.stdout.trim().split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

function fileIssues(filepath) {
	const issues = [];
	if (!existsSync(filepath)) return issues;
	const base = basename(filepath);
	if (base === ".env" || base.startsWith(".env.")) {
		issues.push(`.env file staged: ${filepath}`);
		return issues;
	}
	let content;
	try {
		content = readFileSync(filepath, "utf8");
	} catch {
		return issues;
	}
	if (MERGE_CONFLICT.test(content)) {
		issues.push(`Merge conflict markers in ${filepath}`);
	}
	if (
		!isTestFile(filepath) &&
		PLACEHOLDER_HARD.slice(0, 4).some((pat) => pat.test(content))
	) {
		issues.push(`Placeholder in ${filepath}`);
	}
	if (SECRET_PATTERNS.some((pat) => pat.test(content))) {
		issues.push(`Possible secret/credential in ${filepath}`);
	}
	return issues;
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
	if (!cmd.includes("git commit")) return [];
	const staged = getStagedFiles();
	const blockers = [];
	for (const filepath of staged) {
		blockers.push(...fileIssues(filepath));
	}
	return blockers;
}

const data = readStdin();
if (!data || data.tool_name !== "Bash") passthrough();

const command = (data.tool_input?.command ?? "").trim();

const msg = checkLargeOutput(command);
if (msg) deny(`[guard] ${msg}`);

if (forbiddenGitAdd(command))
	deny("Use `git add <specific files>` - review what you're staging.");
if (forbiddenRm(command))
	deny("Blocked: rm -rf on broad path. Be more specific.");

const blockers = precommitCheck(command);
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

if (DNS_EXFIL.test(command)) {
	deny(
		"[guard] DNS/ICMP tools can exfiltrate data (CVE-2025-55284). Use curl for connectivity checks.",
	);
}

passthrough();
