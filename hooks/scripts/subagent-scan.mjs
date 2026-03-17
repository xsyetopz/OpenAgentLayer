#!/usr/bin/env node
import "./suppress-stderr.mjs";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
	block,
	isMetaFile,
	isTestFile,
	PLACEHOLDER_HARD,
	PLACEHOLDER_SOFT,
	passthrough,
	readStdin,
	warn,
} from "./_lib.mjs";

function runGitDiff(...args) {
	try {
		const result = spawnSync("git", ["diff", "--name-only", ...args], {
			encoding: "utf8",
			timeout: 10000,
		});
		if (!result.stdout?.trim()) return new Set();
		return new Set(result.stdout.trim().split("\n").filter(Boolean));
	} catch {
		return new Set();
	}
}

function modifiedFiles() {
	const files = new Set([...runGitDiff("HEAD"), ...runGitDiff("--cached")]);
	return [...files].filter(Boolean);
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
	return [hard, soft];
}

function scanFiles(files) {
	const allHard = [];
	const allSoft = [];
	for (const filepath of files) {
		if (!existsSync(filepath) || isTestFile(filepath) || isMetaFile(filepath))
			continue;
		const lines = readFileLines(filepath);
		const [hard, soft] = matchPlaceholders(filepath, lines);
		allHard.push(...hard);
		allSoft.push(...soft);
	}
	return [allHard, allSoft];
}

(async () => {
	try {
		const data = await readStdin();
		if (!data || data.stop_hook_active) passthrough();

		const files = modifiedFiles();
		if (!files.length) passthrough();

		const [allHard, allSoft] = scanFiles(files);

		if (allHard.length > 0) {
			const output =
				`Completion check: ${allHard.length} placeholder(s), ` +
				`${allSoft.length} hedge(s) in modified files:\n` +
				[...allHard, ...allSoft].slice(0, 15).join("\n");
			block(`${output}\n\nFix all placeholder code before finishing.`);
		} else if (allSoft.length > 0) {
			const output =
				`Completion check: ${allSoft.length} hedge(s) in modified files:\n` +
				allSoft.slice(0, 15).join("\n");
			warn(output, "SubagentStop");
		} else {
			passthrough();
		}
	} catch {
		passthrough();
	}
})();
