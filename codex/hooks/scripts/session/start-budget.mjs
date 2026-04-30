#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { passthrough, readStdin } from "../_lib.mjs";
import { loadProjectMemory, renderMemoryContext } from "../_memory.mjs";
import { renderCavemanContext, seedSessionMode } from "./_caveman.mjs";

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

function persistenceWarnings(pathname) {
	try {
		const content = readFileSync(pathname, "utf8");
		const warnings = [];
		if (/sqlite\s*=\s*false/.test(content)) {
			warnings.push(
				`SQLite persistence appears disabled in ${pathname}. openagentsbtw Codex memory expects it to stay on.`,
			);
		}
		if (/persistence\s*=\s*"none"/.test(content)) {
			warnings.push(
				`History persistence appears disabled in ${pathname}. openagentsbtw Codex memory will not persist across sessions.`,
			);
		}
		return warnings;
	} catch {
		return [];
	}
}

function commandExists(command) {
	try {
		if (process.platform === "win32") {
			return (
				spawnSync("where", [command], { stdio: "ignore", shell: true })
					.status === 0
			);
		}
		return (
			spawnSync("sh", ["-lc", `command -v ${command} >/dev/null 2>&1`], {
				stdio: "ignore",
			}).status === 0
		);
	} catch {
		return false;
	}
}

function isUsableExecutable(pathname) {
	try {
		return existsSync(pathname);
	} catch {
		return false;
	}
}

(async () => {
	const data = await readStdin();
	const cwd = data.cwd || process.cwd();
	const warnings = [];
	const managedBinDir =
		process.platform === "win32"
			? join(
					process.env.APPDATA ||
						join(process.env.HOME || "", "AppData", "Roaming"),
					"openagentsbtw",
					"bin",
				)
			: join(process.env.HOME || "", ".local", "bin");
	const fallbackWrapper = join(
		process.env.HOME || "",
		".codex",
		"openagentsbtw",
		"bin",
		"oabtw-codex",
	);
	const managedShim =
		process.platform === "win32"
			? join(managedBinDir, "oabtw-codex.cmd")
			: join(managedBinDir, "oabtw-codex");

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
		if (existsSync(configPath)) {
			warnings.push(...persistenceWarnings(configPath));
		}
	}

	const wrapperAvailable =
		commandExists("oabtw-codex") ||
		isUsableExecutable(managedShim) ||
		isUsableExecutable(fallbackWrapper);
	if (!wrapperAvailable) {
		warnings.push(
			`oabtw-codex wrapper is unavailable. Expected shim location: ${managedBinDir}. Direct fallback: ${fallbackWrapper}`,
		);
	}

	const memory = await loadProjectMemory(cwd);
	const cavemanContext = renderCavemanContext(seedSessionMode());
	const additionalContext = [renderMemoryContext(memory, true), cavemanContext]
		.filter(Boolean)
		.join("\n\n");
	if (!warnings.length && !additionalContext) passthrough();

	process.stdout.write(
		`${JSON.stringify({
			continue: true,
			...(warnings.length ? { systemMessage: warnings.join("\n") } : {}),
			...(additionalContext
				? {
						hookSpecificOutput: {
							hookEventName: "SessionStart",
							additionalContext,
						},
					}
				: {}),
		})}\n`,
	);
	process.exit(0);
})();
