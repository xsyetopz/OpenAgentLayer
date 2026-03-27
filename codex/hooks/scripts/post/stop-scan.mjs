#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
	isProseFile,
	isMetaFile,
	isTestFile,
	matchCommentSlop,
	matchPlaceholders,
	matchProseSlop,
	matchSycophancy,
	passthrough,
	readStdin,
	stopBlock,
	systemMessage,
} from "../_lib.mjs";

function modifiedFiles() {
	const files = new Set();
	for (const args of [
		["diff", "--name-only", "HEAD"],
		["diff", "--cached", "--name-only"],
	]) {
		try {
			const result = spawnSync("git", args, {
				encoding: "utf8",
				timeout: 5000,
			});
			for (const file of result.stdout.trim().split("\n").filter(Boolean)) {
				files.add(file);
			}
		} catch {
			// Ignore git failures.
		}
	}
	return [...files];
}

function scan(files) {
	const hard = [];
	const soft = [];
	const commentSlop = [];
	const proseSlop = [];
	const sycophancy = [];

	for (const file of files) {
		if (!existsSync(file) || isTestFile(file) || isMetaFile(file)) continue;
		try {
			const content = readFileSync(file, "utf8");
			const lines = content.split("\n");
			const result = matchPlaceholders(file, lines);
			hard.push(...result.hard);
			soft.push(...result.soft);
			commentSlop.push(...matchCommentSlop(file, lines));
			sycophancy.push(...matchSycophancy(file, lines));
			if (isProseFile(file)) {
				proseSlop.push(...matchProseSlop(file, lines));
			}
		} catch {
			// Ignore binary or unreadable files.
		}
	}

	return { hard, soft, commentSlop, proseSlop, sycophancy };
}

(async () => {
	const data = await readStdin();
	if (!data || data.stop_hook_active) passthrough();

	const files = modifiedFiles();
	if (!files.length) passthrough();

	const { hard, soft, commentSlop, proseSlop, sycophancy } = scan(files);
	if (hard.length) {
		stopBlock(
			`openagentsbtw completion check found placeholder code in modified files:\n${hard.slice(0, 12).join("\n")}`,
		);
	}
	if (commentSlop.length) {
		stopBlock(
			`openagentsbtw completion check found narrating or educational comments in modified files:\n${commentSlop.slice(0, 12).join("\n")}`,
		);
	}
	if (sycophancy.length) {
		stopBlock(
			`openagentsbtw completion check found sycophantic or optional-offer phrasing in modified files:\n${sycophancy.slice(0, 12).join("\n")}`,
		);
	}
	if (soft.length) {
		systemMessage(
			`openagentsbtw completion check found possible placeholders or hedging in modified files:\n${soft.slice(0, 12).join("\n")}`,
		);
	}
	if (proseSlop.length) {
		systemMessage(
			`openagentsbtw completion check found prose filler in modified files:\n${proseSlop.slice(0, 12).join("\n")}`,
		);
	}
	passthrough();
})();
