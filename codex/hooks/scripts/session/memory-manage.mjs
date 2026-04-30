#!/usr/bin/env node
import {
	describeMemory,
	forgetProjectMemory,
	pruneMemory,
	resolveProjectPath,
} from "../_memory.mjs";

function usage() {
	process.stderr.write(
		`Usage: memory-manage.mjs <show|forget-project|prune> [path]\n`,
	);
	process.exit(1);
}

(async () => {
	const [command, targetPath] = process.argv.slice(2);
	const cwd = resolveProjectPath(targetPath || process.cwd(), process.cwd());

	switch (command) {
		case "show": {
			process.stdout.write(`${await describeMemory(cwd)}\n`);
			process.exit(0);
			break;
		}
		case "forget-project": {
			const removed = await forgetProjectMemory(cwd);
			process.stdout.write(
				removed
					? "Removed openagentsbtw Codex memory for this project.\n"
					: "No openagentsbtw Codex memory was stored for this project.\n",
			);
			process.exit(0);
			break;
		}
		case "prune": {
			const pruned = await pruneMemory();
			process.stdout.write(
				pruned
					? "Pruned openagentsbtw Codex memory.\n"
					: "openagentsbtw Codex memory is unavailable in this Node runtime.\n",
			);
			process.exit(pruned ? 0 : 1);
			break;
		}
		default:
			usage();
	}
})();
