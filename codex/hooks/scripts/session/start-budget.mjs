#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { passthrough, readStdin, systemMessage } from "../_lib.mjs";

const TARGETS = [
	["AGENTS.md", 120],
	[join(process.env.HOME || "", ".codex", "AGENTS.md"), 160],
];

function countLines(pathname) {
	try {
		return readFileSync(pathname, "utf8").split("\n").length;
	} catch {
		return null;
	}
}

function fastModeEnabled(pathname) {
	try {
		const content = readFileSync(pathname, "utf8");
		return (
			/service_tier\s*=\s*"fast"/.test(content) ||
			/fast_mode\s*=\s*true/.test(content)
		);
	} catch {
		return false;
	}
}

(async () => {
	const data = await readStdin();
	const cwd = data.cwd || process.cwd();
	const warnings = [];

	for (const [target, limit] of TARGETS) {
		const fullPath = target.startsWith("/") ? target : join(cwd, target);
		if (!existsSync(fullPath)) continue;
		const lineCount = countLines(fullPath);
		if (lineCount !== null && lineCount > limit) {
			warnings.push(
				`${fullPath} is ${lineCount} lines. Keep AGENTS guidance compact.`,
			);
		}
	}

	const configCandidates = [
		join(process.env.HOME || "", ".codex", "config.toml"),
		join(cwd, ".codex", "config.toml"),
	];
	for (const configPath of configCandidates) {
		if (existsSync(configPath) && fastModeEnabled(configPath)) {
			warnings.push(
				`Fast mode appears enabled in ${configPath}. openagentsbtw expects it to stay off.`,
			);
		}
	}

	if (!warnings.length) passthrough();
	systemMessage(warnings.join("\n"));
})();
