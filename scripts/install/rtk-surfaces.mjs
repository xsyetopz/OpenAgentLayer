import { promises as fs } from "node:fs";
import path from "node:path";
import { mergeTaggedBlock, removeManagedBlock } from "./managed-files.mjs";
import { PATHS, pathExists, readText, writeText } from "./shared.mjs";

export const RTK_BLOCK_START = "<!-- >>> openagentsbtw rtk >>> -->";
export const RTK_BLOCK_END = "<!-- <<< openagentsbtw rtk <<< -->";

export function renderRtkPolicy() {
	return `# RTK - Rust Token Killer

Always prefix RTK-supported shell commands with \`rtk\`.

Examples:

\`\`\`bash
rtk git status
rtk cargo test
rtk npm run build
rtk pytest -q
\`\`\`

When \`RTK.md\` is present and \`rtk\` is installed, openagentsbtw will enforce RTK-prefixed forms where RTK can rewrite the command.
`;
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
			return `## RTK\nRTK policy is installed at \`${map.codex}\`. When RTK is active, shell commands must use \`rtk\` or the RTK hook-provided rewrite.`;
		case "copilot":
			return `## RTK\nRTK policy is installed at \`${map.copilot}\`. When RTK is active, shell commands must use \`rtk\` or the RTK hook-provided rewrite.`;
		case "opencode":
			return `## RTK\nRTK policy is installed at \`${map.opencode}\`. When RTK is active, shell commands must use \`rtk\` or the RTK hook-provided rewrite.`;
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
