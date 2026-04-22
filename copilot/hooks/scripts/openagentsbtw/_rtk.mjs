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

function hasShellOperators(command) {
	return /[\n;&|<>`$()]/.test(command);
}

function simpleArgs(command) {
	if (hasShellOperators(command) || /["']/.test(command)) return null;
	return command.split(/\s+/).filter(Boolean);
}

function highGainRewrite(command) {
	const args = simpleArgs(command);
	if (args?.[0] === "bun" && args[1] === "test") {
		return `rtk test ${args.join(" ")}`;
	}
	if (
		args?.[0] === "bun" &&
		args[1] === "run" &&
		/^test(?::|$)/.test(args[2] || "")
	) {
		return `rtk test ${args.join(" ")}`;
	}
	if (args?.[0] === "bunx" && args[1] === "tsc") {
		return `rtk tsc ${args.slice(2).join(" ")}`.trim();
	}
	if (
		args?.[0] === "cat" &&
		args.length > 1 &&
		!args.slice(1).some((arg) => arg.startsWith("-"))
	) {
		return `rtk read ${args.slice(1).join(" ")}`;
	}

	const headSed = command.match(
		/^sed\s+-n\s+['"]1,(\d+)p['"]\s+([^\s'";&|<>`$()]+)$/,
	);
	if (headSed) {
		return `rtk read --max-lines ${headSed[1]} ${headSed[2]}`;
	}
	return "";
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

	const highGain = highGainRewrite(normalized);
	if (highGain) {
		return { policyPath, rewritten: highGain };
	}

	return { policyPath, rewritten: proxyRewrite(normalized) };
}
