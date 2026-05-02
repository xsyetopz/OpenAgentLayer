#!/usr/bin/env bun
import { resolve } from "node:path";
import { runAcceptCommand } from "./commands/accept";
import { runCheckCommand } from "./commands/check";
import { runDeployCommand } from "./commands/deploy";
import { runPluginsCommand } from "./commands/plugins";
import { runPreviewCommand } from "./commands/preview";
import { runRenderCommand } from "./commands/render";
import { runRoadmapEvidenceCommand } from "./commands/roadmap-evidence";
import { runRtkGainCommand } from "./commands/rtk-gain";
import { runToolchainCommand } from "./commands/toolchain";
import { runUninstallCommand } from "./commands/uninstall";

const repoRoot = resolve(import.meta.dir, "../../..");
const [command, ...args] = process.argv.slice(2);

if (!command || command === "help") usage();
switch (command) {
	case "accept":
		await runAcceptCommand(repoRoot);
		break;
	case "check":
		await runCheckCommand(repoRoot);
		break;
	case "render":
	case "generate":
		await runRenderCommand(repoRoot, args);
		break;
	case "preview":
		await runPreviewCommand(repoRoot, args);
		break;
	case "deploy":
		await runDeployCommand(repoRoot, args);
		break;
	case "uninstall":
		await runUninstallCommand(args);
		break;
	case "plugins":
		await runPluginsCommand(repoRoot, args);
		break;
	case "toolchain":
		await runToolchainCommand(args);
		break;
	case "rtk-gain":
		await runRtkGainCommand(repoRoot, args);
		break;
	case "roadmap-evidence":
		await runRoadmapEvidenceCommand(repoRoot);
		break;
	default:
		usage();
}

function usage(): never {
	console.log(
		"Usage: oal accept|roadmap-evidence|rtk-gain [--from-file path] [--allow-empty-history]|check|preview [--provider all|codex|claude|opencode] [--path artifact] [--content]|render|generate [--provider all|codex|claude|opencode] [--out dir]|deploy --target dir [--scope project] [--provider all|codex|claude|opencode] [--dry-run]|uninstall --target dir --scope project --provider <provider>|plugins [--home dir] [--provider all|codex|claude|opencode] [--dry-run]|toolchain [--os macos|linux] [--pkg brew|apt|dnf|pacman|zypper|apk] [--optional ctx7,deepwiki,playwright]",
	);
	process.exit(command ? 2 : 0);
}
