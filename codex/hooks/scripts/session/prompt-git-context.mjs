#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { passthrough, readStdin } from "../_lib.mjs";
import { renderCavemanContext, updateSessionMode } from "./_caveman.mjs";

function runGit(args) {
	try {
		const result = spawnSync("git", args, {
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
	const prompt = (data?.prompt ?? "").trim();
	if (!prompt) passthrough();

	// One-turn escape hatch: no injection and no extra context.
	if (prompt.startsWith("!raw")) passthrough();

	const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
	const recent = runGit(["log", "--oneline", "-5", "--no-decorate"]);
	const diffStat = runGit(["diff", "--stat", "--no-color", "HEAD"]);
	const cavemanContext = renderCavemanContext(updateSessionMode(prompt));
	const parts = [];

	if (branch) parts.push(`Branch: ${branch}`);
	if (recent) parts.push(`Recent commits:\n${recent}`);
	if (diffStat) parts.push(`Uncommitted changes:\n${diffStat}`);
	if (cavemanContext) parts.push(cavemanContext);

	if (!parts.length) passthrough();

	const output = [];
	if (parts.length) {
		output.push(`openagentsbtw git context:\n${parts.join("\n\n")}`);
	}

	process.stdout.write(`${output.join("\n\n")}\n`);
	process.exit(0);
})();
