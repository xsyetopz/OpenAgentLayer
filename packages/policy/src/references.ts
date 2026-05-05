import type { SourceGraph } from "@openagentlayer/source";
import type { PolicyIssue } from "./types";

export function validateReferences(
	graph: SourceGraph,
	issues: PolicyIssue[],
): void {
	for (const agent of graph.source.agents) {
		for (const skill of agent.skills)
			if (!graph.skillIds.has(skill))
				issues.push({
					severity: "error",
					code: "missing-skill",
					message: `Agent \`${agent.id}\` needs referenced skill \`${skill}\``,
					sourceId: agent.id,
				});
		for (const route of agent.routes)
			if (!graph.routeIds.has(route))
				issues.push({
					severity: "error",
					code: "missing-route",
					message: `Agent \`${agent.id}\` needs referenced route \`${route}\``,
					sourceId: agent.id,
				});
	}
	for (const route of graph.source.routes) {
		if (!graph.agentIds.has(route.agent))
			issues.push({
				severity: "error",
				code: "missing-agent",
				message: `Route \`${route.id}\` needs referenced agent \`${route.agent}\``,
				sourceId: route.id,
			});
		for (const skill of route.skills)
			if (!graph.skillIds.has(skill))
				issues.push({
					severity: "error",
					code: "missing-route-skill",
					message: `Route \`${route.id}\` needs referenced skill \`${skill}\``,
					sourceId: route.id,
				});
	}
}
