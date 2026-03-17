#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
	isMetaFile,
	isTestFile,
	PLACEHOLDER_HARD,
	PLACEHOLDER_SOFT,
	passthrough,
	readStdin,
	stopBlock,
	stopWarn,
} from "../_lib.mjs";

function runGitDiff(...args) {
	try {
		const result = spawnSync("git", ["diff", "--name-only", ...args], {
			encoding: "utf8",
			timeout: 10000,
		});
		const out = (result.stdout || "").trim();
		return out ? new Set(out.split("\n")) : new Set();
	} catch {
		return new Set();
	}
}

function modifiedFiles() {
	const head = runGitDiff("HEAD");
	const cached = runGitDiff("--cached");
	const merged = new Set([...head, ...cached]);
	return [...merged].filter(Boolean);
}

function readFileLines(filepath) {
	try {
		return readFileSync(filepath, "utf8").split("\n");
	} catch {
		return [];
	}
}

function matchPlaceholders(filepath, lines) {
	const hard = [];
	const soft = [];
	lines.forEach((line, idx) => {
		const lineNum = idx + 1;
		if (PLACEHOLDER_HARD.some((pat) => pat.test(line))) {
			hard.push(`  ${filepath}:${lineNum}: ${line.trim().slice(0, 80)}`);
		} else if (PLACEHOLDER_SOFT.some((pat) => pat.test(line))) {
			soft.push(`  ${filepath}:${lineNum}: ${line.trim().slice(0, 80)}`);
		}
	});
	return { hard, soft };
}

function scanFiles(files) {
	const allHard = [];
	const allSoft = [];
	for (const filepath of files) {
		if (!existsSync(filepath) || isTestFile(filepath) || isMetaFile(filepath))
			continue;
		try {
			if (!statSync(filepath).isFile()) continue;
		} catch {
			continue;
		}
		const lines = readFileLines(filepath);
		const { hard, soft } = matchPlaceholders(filepath, lines);
		allHard.push(...hard);
		allSoft.push(...soft);
	}
	return { allHard, allSoft };
}

function sessionExportStale(projectDir) {
	const handoff = join(projectDir, ".claude", "session-handoff.md");
	if (!existsSync(handoff)) return true;
	try {
		const mtime = statSync(handoff).mtime;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return mtime < today;
	} catch {
		return true;
	}
}

const data = readStdin();
if (!data || !Object.keys(data).length || data.stop_hook_active) passthrough();

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const files = modifiedFiles();

if (files.length) {
	const { allHard, allSoft } = scanFiles(files);

	if (allHard.length) {
		const output =
			`Completion check: ${allHard.length} placeholder(s), ` +
			`${allSoft.length} hedge(s) in modified files:\n` +
			[...allHard, ...allSoft].slice(0, 15).join("\n");
		stopBlock(`${output}\n\nFix all placeholder code before finishing.`);
	} else if (allSoft.length) {
		const output =
			`Completion check: ${allSoft.length} hedge(s) in modified files:\n` +
			allSoft.slice(0, 15).join("\n");
		stopWarn(output);
	}
}

if (sessionExportStale(projectDir)) {
	stopWarn(
		"Consider running /cca:session-export to save a handoff for your next session.",
	);
} else {
	passthrough();
}
