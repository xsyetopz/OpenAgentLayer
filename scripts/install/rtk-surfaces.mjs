import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { mergeTaggedBlock, removeManagedBlock } from "./managed-files.mjs";
import { PATHS, pathExists, readText, writeText } from "./shared.mjs";

export const RTK_BLOCK_START = "<!-- >>> openagentsbtw rtk >>> -->";
export const RTK_BLOCK_END = "<!-- <<< openagentsbtw rtk <<< -->";

export function renderRtkPolicy() {
	return `# RTK - Rust Token Killer

Always prefix RTK-supported shell commands with \`rtk\`. Prefer the most specific filtering command available, and use \`--ultra-compact\` for broad searches, tests, builds, lint, logs, and diagnostics. Use \`rtk proxy\` only when no specialized filter preserves command semantics.

Decision order:

1. If unsure, run \`rtk rewrite <raw command>\` first and use its suggestion.
2. Prefer a specialized filter: \`rtk test\`, \`rtk err\`, \`rtk summary\`, \`rtk grep\`, \`rtk read\`, \`rtk json\`, \`rtk diff\`, \`rtk log\`, or \`rtk pipe\`.
3. Add \`--ultra-compact\` unless full output is explicitly required.
4. Fall back to \`rtk proxy\` only for commands that cannot be filtered safely.

High-gain examples:

\`\`\`bash
rtk --ultra-compact git status
rtk --ultra-compact diff
rtk --ultra-compact read package.json
rtk --ultra-compact grep -n "pattern" source tests
rtk --ultra-compact find source -maxdepth 3 -type f -name '*.json'
rtk --ultra-compact test bun test tests claude/tests codex/tests
rtk --ultra-compact test bun run test
rtk --ultra-compact tsc --noEmit
rtk --ultra-compact test npm test
rtk --ultra-compact test pnpm test
rtk --ultra-compact cargo test
rtk --ultra-compact go test ./...
rtk --ultra-compact dotnet test
rtk --ultra-compact test node --test
rtk --ultra-compact test flutter test
rtk --ultra-compact summary flutter analyze
rtk --ultra-compact err bun run build
rtk --ultra-compact lint bunx biome lint .
rtk --ultra-compact summary bunx biome check .
rtk --ultra-compact env
rtk --ultra-compact json package.json
rtk --ultra-compact pytest -q
\`\`\`

For Bun projects, do not run raw \`bun test\`, \`bun run test\`, \`bun run typecheck\`, \`bunx tsc\`, or Biome checks. Use RTK filters so output is filtered instead of merely proxied. Avoid ad-hoc \`python3 -\` scripts for repo inspection; use \`rtk read\`, \`rtk json\`, \`rtk grep\`, or a checked-in script through \`rtk err\`/\`rtk summary\`.

Use \`rtk gain --project --history\`, \`rtk gain --failures\`, and \`rtk hook-audit --since 30\` to verify efficiency. Validation-heavy sessions should exceed 70% project-scope savings; supported high-output commands should usually exceed 80%.

When \`RTK.md\` is present and \`rtk\` is installed, openagentsbtw enforces RTK-prefixed forms where RTK can rewrite the command or apply an openagentsbtw high-gain rewrite.
`;
}

export function rtkConfigPath({
	platform = process.platform,
	env = process.env,
	homeDir = os.homedir(),
} = {}) {
	const pathLib = platform === "win32" ? path.win32 : path.posix;
	if (platform === "win32") {
		return pathLib.join(
			env.APPDATA ?? pathLib.join(homeDir, "AppData", "Roaming"),
			"rtk",
			"config.toml",
		);
	}
	if (platform === "darwin") {
		return pathLib.join(
			homeDir,
			"Library",
			"Application Support",
			"rtk",
			"config.toml",
		);
	}
	return pathLib.join(
		env.XDG_CONFIG_HOME ?? pathLib.join(homeDir, ".config"),
		"rtk",
		"config.toml",
	);
}

export function rtkCodexDatabasePath(paths = PATHS) {
	return path.join(paths.codexHome, "memories", "rtk", "history.db");
}

function mergeTrackingDatabasePath(existing, databasePath) {
	const line = `database_path = ${JSON.stringify(databasePath)}`;
	if (/^\[tracking\]\s*$/m.test(existing)) {
		const lines = existing.split("\n");
		const output = [];
		let inTracking = false;
		let wrote = false;
		for (const current of lines) {
			if (/^\s*\[/.test(current)) {
				if (inTracking && !wrote) {
					output.push(line);
					wrote = true;
				}
				inTracking = /^\[tracking\]\s*$/.test(current);
			}
			if (inTracking && /^\s*database_path\s*=/.test(current)) {
				if (!wrote) output.push(line);
				wrote = true;
				continue;
			}
			output.push(current);
		}
		if (inTracking && !wrote) output.push(line);
		return output.join("\n").trimEnd() + "\n";
	}
	return [existing.trimEnd(), "", "[tracking]", line, ""]
		.filter(Boolean)
		.join("\n");
}

export async function writeRtkCodexTrackingConfig(paths = PATHS) {
	const configPath = rtkConfigPath({ homeDir: paths.homeDir });
	const databasePath = rtkCodexDatabasePath(paths);
	await fs.mkdir(path.dirname(databasePath), { recursive: true });
	const existing = await readText(configPath, "");
	await writeText(
		configPath,
		mergeTrackingDatabasePath(existing, databasePath),
	);
	return { configPath, databasePath };
}

export function rtkPolicyPathMap(paths = PATHS) {
	return {
		canonical: paths.globalRtkMd,
		claude: path.join(paths.claudeHome, "RTK.md"),
		codex: path.join(paths.codexHome, "RTK.md"),
		copilot: path.join(paths.copilotHome, "RTK.md"),
		opencode: path.join(paths.opencodeConfigDir, "RTK.md"),
	};
}

export function selectedRtkPolicyTargets(selection = {}, paths = PATHS) {
	const map = rtkPolicyPathMap(paths);
	const targets = [map.canonical];
	if (selection.claude ?? selection.installClaude) targets.push(map.claude);
	if (selection.codex ?? selection.installCodex) targets.push(map.codex);
	if (selection.copilot ?? selection.installCopilot) targets.push(map.copilot);
	if (selection.opencode ?? selection.installOpenCode)
		targets.push(map.opencode);
	return [...new Set(targets)];
}

function platformReference(tool, paths = PATHS) {
	const map = rtkPolicyPathMap(paths);
	switch (tool) {
		case "claude":
			return "@RTK.md";
		case "codex":
			return `## RTK\nRTK policy is installed at \`${map.codex}\`. Always use rtk for supported shell commands. When RTK is active, shell commands must use \`rtk\` or the RTK hook-provided rewrite.`;
		case "copilot":
			return `## RTK\nRTK policy is installed at \`${map.copilot}\`. Always use rtk for supported shell commands. When RTK is active, shell commands must use \`rtk\` or the RTK hook-provided rewrite.`;
		case "opencode":
			return `## RTK\nRTK policy is installed at \`${map.opencode}\`. Always use rtk for supported shell commands. When RTK is active, shell commands must use \`rtk\` or the RTK hook-provided rewrite.`;
		default:
			throw new Error(`Unsupported RTK reference tool: ${tool}`);
	}
}

export function rtkReferenceTargets({
	claude = false,
	codex = false,
	copilotGlobal = false,
	copilotProject = false,
	opencodeGlobal = false,
	opencodeProject = false,
	paths = PATHS,
	workspacePaths = null,
} = {}) {
	const targets = [];
	if (claude) {
		targets.push({
			tool: "claude",
			path: path.join(paths.claudeHome, "CLAUDE.md"),
		});
	}
	if (codex) {
		targets.push({
			tool: "codex",
			path: path.join(paths.codexHome, "AGENTS.md"),
		});
	}
	if (copilotGlobal) {
		targets.push({
			tool: "copilot",
			path: path.join(paths.copilotHome, "copilot-instructions.md"),
		});
	}
	if (copilotProject) {
		if (!workspacePaths) {
			throw new Error(
				"workspacePaths required for project Copilot RTK reference",
			);
		}
		targets.push({
			tool: "copilot",
			path: path.join(
				workspacePaths.projectGithubDir,
				"copilot-instructions.md",
			),
		});
	}
	if (opencodeGlobal) {
		targets.push({
			tool: "opencode",
			path: path.join(
				paths.opencodeConfigDir,
				"instructions",
				"openagentsbtw.md",
			),
		});
	}
	if (opencodeProject) {
		if (!workspacePaths) {
			throw new Error(
				"workspacePaths required for project OpenCode RTK reference",
			);
		}
		targets.push({
			tool: "opencode",
			path: path.join(
				workspacePaths.projectOpenCodeDir,
				"instructions",
				"openagentsbtw.md",
			),
		});
	}
	return targets;
}

export function installSelectionToRtkReferences(
	args,
	workspacePaths,
	paths = PATHS,
) {
	return rtkReferenceTargets({
		claude: Boolean(args.installClaude),
		codex: Boolean(args.installCodex),
		copilotGlobal:
			Boolean(args.installCopilot) &&
			["global", "both"].includes(args.copilotScope),
		copilotProject:
			Boolean(args.installCopilot) &&
			["project", "both"].includes(args.copilotScope),
		opencodeGlobal:
			Boolean(args.installOpenCode) && args.opencodeScope === "global",
		opencodeProject:
			Boolean(args.installOpenCode) && args.opencodeScope === "project",
		paths,
		workspacePaths,
	});
}

export async function writeRtkPolicyFiles(targets) {
	for (const target of targets) {
		await writeText(target, renderRtkPolicy());
	}
}

export async function writeRtkReference(
	{ tool, path: targetPath },
	paths = PATHS,
) {
	const existing = await readText(targetPath, "");
	const block = `${RTK_BLOCK_START}\n${platformReference(tool, paths)}\n${RTK_BLOCK_END}`;
	await writeText(
		targetPath,
		mergeTaggedBlock(existing, block, RTK_BLOCK_START, RTK_BLOCK_END),
	);
}

export async function writeRtkReferences(targets, paths = PATHS) {
	for (const target of targets) {
		await writeRtkReference(target, paths);
	}
}

export async function removeRtkReference(targetPath) {
	if (!(await pathExists(targetPath))) return;
	const next = removeManagedBlock(
		await readText(targetPath, ""),
		RTK_BLOCK_START,
		RTK_BLOCK_END,
	);
	await writeText(targetPath, next);
}

export async function removeManagedRtkPolicy(targetPath) {
	const text = await readText(targetPath, "");
	if (!text.includes("# RTK - Rust Token Killer")) return;
	await fs.rm(targetPath, { force: true });
}

export async function removeRtkSurfaces({
	policyTargets = [],
	referenceTargets = [],
} = {}) {
	for (const target of policyTargets) {
		await removeManagedRtkPolicy(target);
	}
	for (const target of referenceTargets) {
		await removeRtkReference(target.path ?? target);
	}
}
