#!/usr/bin/env node
import { auditLog, readStdin, warn } from "../_lib.mjs";

function main() {
	const data = readStdin();
	const agentName = data.agent_name ?? data.teammate_name ?? "unknown";

	auditLog("TeammateIdle", "teammate-idle.mjs", "idle_detected", {
		extra: { agent: agentName },
	});

	warn(
		`Agent '${agentName}' is about to go idle. Before idling, verify: ` +
			`(1) All assigned tasks are complete — no pending work. ` +
			`(2) Results have been communicated to the team lead. ` +
			`(3) No blocking issues remain unreported. ` +
			`If work remains, continue instead of idling.`,
		"TeammateIdle",
	);
}

main();
