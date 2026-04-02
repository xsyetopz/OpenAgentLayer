#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { persistTurnMemory } from "../_memory.mjs";
import {
	isProseFile,
	isMetaFile,
	isTestFile,
	matchPlaceholders,
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
	const hardProse = [];

	for (const file of files) {
		if (!existsSync(file) || isTestFile(file) || isMetaFile(file)) continue;
		try {
			const content = readFileSync(file, "utf8");
			const lines = content.split("\n");
			const result = matchPlaceholders(file, lines);
			if (isProseFile(file)) {
				hardProse.push(...result.hard);
			} else {
				hard.push(...result.hard);
			}
			soft.push(...result.soft);
		} catch {
			// Ignore binary or unreadable files.
		}
	}

	return { hard, hardProse, soft };
}

(async () => {
	const data = await readStdin();
	if (!data || data.stop_hook_active) passthrough();

	const memoryResult = await persistTurnMemory(data);

	const files = modifiedFiles();
	if (!files.length) {
		if (memoryResult?.skipped === "transcript_unavailable") {
			systemMessage(
				"openagentsbtw memory skipped this turn because Codex did not expose a transcript path. Ephemeral or non-persistent sessions will not be recalled later.",
			);
		}
		passthrough();
	}

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
		const notes = [
			`openagentsbtw completion check found possible placeholders or hedging in modified files:\n${soft.slice(0, 12).join("\n")}`,
		];
		if (memoryResult?.skipped === "transcript_unavailable") {
			notes.push(
				"openagentsbtw memory skipped this turn because Codex did not expose a transcript path.",
			);
		}
		systemMessage(notes.join("\n\n"));
	}
	if (
		!soft.length &&
		memoryResult?.skipped === "transcript_unavailable"
	) {
		systemMessage(
			"openagentsbtw memory skipped this turn because Codex did not expose a transcript path. Ephemeral or non-persistent sessions will not be recalled later.",
		);
	}
	passthrough();
})();
