#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readStdin } from "../_lib.mjs";

const TARGETS = [
	["CLAUDE.md", 150],
	[".claude/CLAUDE.md", 150],
	["MEMORY.md", 200],
	[".claude/memory/MEMORY.md", 200],
];

const EXPECTED_DENY = new Set([
	"Agent(Explore)",
	"Agent(Plan)",
	"Agent(general-purpose)",
]);

function fileLineCountExceedsLimit(baseDir, relPath, limit) {
	const fullPath = join(baseDir, relPath);
	if (!existsSync(fullPath)) return null;
	const lines = readFileSync(fullPath, "utf8").split("\n").length - 1;
	if (lines > limit) {
		return `[budget] ${relPath}: ${lines} lines (target ${limit}). Compact this file to reduce per-turn token cost.`;
	}
	return null;
}

function collectLineBudgetWarnings(baseDir) {
	const warnings = [];
	for (const [relPath, limit] of TARGETS) {
		const msg = fileLineCountExceedsLimit(baseDir, relPath, limit);
		if (msg) warnings.push(msg);
	}
	return warnings;
}

function checkPermissionsDeny(projectDir) {
	const settingsPath = join(projectDir, ".claude", "settings.json");
	if (!existsSync(settingsPath)) return null;
	try {
		const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
		const denyList = new Set(settings.permissions?.deny ?? []);
		const missing = [...EXPECTED_DENY].filter((entry) => !denyList.has(entry));
		if (missing.length > 0) {
			const missingJson = missing
				.sort()
				.map((m) => `"${m}"`)
				.join(", ");
			const allDeny = [...EXPECTED_DENY]
				.sort()
				.map((d) => `"${d}"`)
				.join(", ");
			return (
				`[permissions] Missing permissions.deny entries: ${missingJson}. ` +
				"Built-in subagents (Explore, Plan, general-purpose) should be denied " +
				"so custom agents are used instead. Add to .claude/settings.json: " +
				`"permissions": {"deny": [${allDeny}]}`
			);
		}
	} catch {
		// best-effort
	}
	return null;
}

(async () => {
	try {
		const data = await readStdin();
		if (!data || Object.keys(data).length === 0) process.exit(0);

		const projectDir = data.cwd ?? process.cwd();
		const warnings = collectLineBudgetWarnings(projectDir);

		const denyWarning = checkPermissionsDeny(projectDir);
		if (denyWarning) warnings.push(denyWarning);

		if (warnings.length > 0) {
			process.stdout.write(`${warnings.join("\n")}\n`);
		}
		process.exit(0);
	} catch {
		process.exit(0);
	}
})();
