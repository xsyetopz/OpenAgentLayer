#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { passthrough, readStdin, resolveCwd, systemMessage } from "../_lib.mjs";

function runGit(cwd, args) {
	try {
		const result = spawnSync("git", ["-C", cwd, ...args], {
			encoding: "utf8",
			timeout: 1000,
		});
		return result.status === 0 ? result.stdout.trim() : "";
	} catch {
		return "";
	}
}

(async () => {
	const data = await readStdin();
	const cwd = resolveCwd(data);

	const branch = runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
	const recent = runGit(cwd, ["log", "--oneline", "-5", "--no-decorate"]);
	const diffStat = runGit(cwd, ["diff", "--stat", "--no-color", "HEAD"]);

	const parts = [];
	if (branch) parts.push(`Branch: ${branch}`);
	if (recent) parts.push(`Recent commits:\n${recent}`);
	if (diffStat) parts.push(`Uncommitted changes:\n${diffStat}`);
	if (!parts.length) passthrough();

	systemMessage(`openagentsbtw git context:\n${parts.join("\n\n")}`);
})();
