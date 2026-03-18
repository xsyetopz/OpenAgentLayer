#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deny, passthrough, readStdin, auditLog } from "../_lib.mjs";

function getTeamFile() {
	const uid = process.env.USER || process.env.USERNAME || "unknown";
	const sessionId = process.env.CLAUDE_SESSION_ID || "default";
	const dir = join(tmpdir(), "cca-teams");
	mkdirSync(dir, { recursive: true });
	return join(dir, `${uid}-${sessionId}.json`);
}

function readTeamCount(teamFile) {
	try {
		const data = JSON.parse(readFileSync(teamFile, "utf8"));
		return data.count || 0;
	} catch {
		return 0;
	}
}

function incrementTeamCount(teamFile) {
	const count = readTeamCount(teamFile) + 1;
	writeFileSync(teamFile, JSON.stringify({ count, updatedAt: new Date().toISOString() }));
	return count;
}

(async () => {
	try {
		const data = await readStdin();
		if (!data || data.tool_name !== "TeamCreate") passthrough();

		const max = parseInt(process.env.CCA_MAX_TEAMS || "1", 10);
		const teamFile = getTeamFile();
		const current = readTeamCount(teamFile);

		if (current >= max) {
			auditLog("PreToolUse", "team-guard", "deny", `Team limit reached (${current}/${max})`, "TeamCreate");
			deny(
				`Team limit reached (${current}/${max}). Use @odysseus with subagents, or increase CCA_MAX_TEAMS.`,
			);
		}

		incrementTeamCount(teamFile);
		auditLog("PreToolUse", "team-guard", "allow", `Team ${current + 1}/${max} created`, "TeamCreate");
		passthrough();
	} catch {
		passthrough();
	}
})();
