#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const LEGACY_HOME_PATHS = [
	".config/openagentsbtw/RTK.md",
	".codex/RTK.md",
	".claude/RTK.md",
	".copilot/RTK.md",
	".config/opencode/RTK.md",
];

function homeDir() {
	return process.env.HOME || process.env.USERPROFILE || "";
}

function pathExists(filepath) {
	return filepath ? existsSync(filepath) : false;
}

function findRepoRtkMd(startCwd) {
	let current = resolve(startCwd || process.cwd());
	while (true) {
		const candidate = join(current, "RTK.md");
		if (pathExists(candidate)) return candidate;
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return "";
}

function findHomeRtkMd() {
	const home = homeDir();
	if (home) {
		for (const relativePath of LEGACY_HOME_PATHS) {
			const candidate = join(home, relativePath);
			if (pathExists(candidate)) return candidate;
		}
	}
	const appData = process.env.APPDATA || "";
	if (appData) {
		const candidate = join(appData, "opencode", "RTK.md");
		if (pathExists(candidate)) return candidate;
	}
	return "";
}

export function findRtkMd(cwd = process.cwd()) {
	return findRepoRtkMd(cwd) || findHomeRtkMd();
}

export function hasRtkBinary() {
	try {
		const result = spawnSync("rtk", ["--version"], {
			env: process.env,
			encoding: "utf8",
			timeout: 3000,
			shell: process.platform === "win32",
		});
		return result.status === 0;
	} catch {
		return false;
	}
}

function shellQuote(command) {
	return `'${String(command).replaceAll("'", "'\\''")}'`;
}

function proxyRewrite(command) {
	if (process.platform === "win32") {
		return `rtk proxy -- ${command}`;
	}
	return `rtk proxy -- bash -lc ${shellQuote(command)}`;
}

export function getRtkRewrite(command, cwd = process.cwd()) {
	const normalized = String(command || "").trim();
	if (!normalized || /^\s*rtk\b/.test(normalized)) return null;
	const policyPath = findRtkMd(cwd);
	if (!policyPath || !hasRtkBinary()) return null;

	try {
		const result = spawnSync("rtk", ["rewrite", normalized], {
			cwd,
			env: process.env,
			encoding: "utf8",
			timeout: 3000,
			shell: process.platform === "win32",
		});
		const rewritten = (result.stdout || "").trim();
		if (/^rtk\b/.test(rewritten) && rewritten !== normalized) {
			return { policyPath, rewritten };
		}
	} catch {
		// Fall back to proxy rewrite below.
	}

	return { policyPath, rewritten: proxyRewrite(normalized) };
}
