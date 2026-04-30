#!/usr/bin/env node
import { additionalContext, passthrough, readStdin } from "../_lib.mjs";
import { buildRouteContext, resolveAgentRoute } from "./_route-context.mjs";

(async () => {
	const data = await readStdin();
	const agentName = String(data.agentName ?? data.agent_name ?? "").trim();
	if (!agentName) passthrough();

	const contract = resolveAgentRoute(agentName);
	if (!contract) passthrough();

	const context = buildRouteContext(contract, [
		`OPENAGENTSBTW_AGENT=${agentName}`,
	]);
	if (!context) passthrough();
	additionalContext(context);
})();
