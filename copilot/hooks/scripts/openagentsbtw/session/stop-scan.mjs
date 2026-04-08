#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
	isMetaFile,
	isProseFile,
	isTestFile,
	matchPlaceholders,
	passthrough,
	readStdin,
	resolveCwd,
	stopBlock,
	systemMessage,
} from "../_lib.mjs";

function runGit(cwd, args) {
	try {
		const result = spawnSync("git", ["-C", cwd, ...args], {
			encoding: "utf8",
			timeout: 5000,
		});
		return result.status === 0 ? result.stdout.trim() : "";
	} catch {
		return "";
	}
}

function modifiedFiles(cwd) {
	const files = new Set();
	for (const args of [
		["diff", "--name-only", "HEAD"],
		["diff", "--cached", "--name-only"],
	]) {
		const stdout = runGit(cwd, args);
		for (const file of stdout.split("\n").filter(Boolean)) files.add(file);
	}
	return [...files];
}

function scan(files) {
	const hard = [];
	const hardProse = [];
	const soft = [];

	for (const file of files) {
		if (!existsSync(file) || isTestFile(file) || isMetaFile(file)) continue;
		try {
			const content = readFileSync(file, "utf8");
			const lines = content.split("\n");
			const result = matchPlaceholders(file, lines);
			if (isProseFile(file)) hardProse.push(...result.hard);
			else hard.push(...result.hard);
			soft.push(...result.soft);
		} catch {
			// Ignore binary or unreadable files.
		}
	}

	return { hard, hardProse, soft };
}

(async () => {
	const data = await readStdin();
	const cwd = resolveCwd(data);
	const files = modifiedFiles(cwd);
	if (!files.length) passthrough();

	const { hard, hardProse, soft } = scan(files);
	if (hard.length) {
		stopBlock(
			`openagentsbtw completion check found placeholder code in modified files:\n${hard.slice(0, 12).join("\n")}`,
		);
	}
	if (hardProse.length) {
		systemMessage(
			`openagentsbtw completion check found placeholders in prose files (non-blocking):\n${hardProse.slice(0, 12).join("\n")}`,
		);
	}
	if (soft.length) {
		systemMessage(
			`openagentsbtw completion check found possible placeholders or hedging in modified files:\n${soft.slice(0, 12).join("\n")}`,
		);
	}
	passthrough();
})();
