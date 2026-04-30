#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { auditLog, hiddenContext, passthrough, readStdin } from "../_lib.mjs";
import { buildRouteContext, resolveAgentRoute } from "./_route-context.mjs";

(async () => {
	try {
		const data = await readStdin();
		const agentType = String(data.agent_type ?? "").trim();
		if (!agentType) {
			passthrough();
		}

		const contract = resolveAgentRoute(agentType);
		if (!contract) {
			passthrough();
		}

		auditLog(
			"SubagentStart",
			"subagent-route-context.mjs",
			"processed",
			"",
			agentType,
		);
		const context = buildRouteContext(contract, [
			`OPENAGENTSBTW_AGENT=${agentType}`,
		]);
		if (!context) {
			passthrough();
		}
		hiddenContext(context, "SubagentStart");
	} catch {
		passthrough();
	}
})();
