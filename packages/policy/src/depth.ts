import type { OalSource } from "@openagentlayer/source";
import type { PolicyIssue } from "./types";

export function validateDepth(source: OalSource, issues: PolicyIssue[]): void {
	for (const agent of source.agents)
		if (
			(agent.prompt?.length ?? 0) < 350 ||
			agent.triggers.length < 2 ||
			agent.nonGoals.length < 2
		)
			issues.push({
				severity: "error",
				code: "stub-agent",
				message: `Agent \`${agent.id}\` is too shallow for production output`,
				sourceId: agent.id,
			});
	for (const skill of source.skills) {
		const supportDepth = (skill.supportFiles ?? [])
			.map((supportFile) => supportFile.content ?? "")
			.join("\n").length;
		if (skill.body.length + supportDepth < 220)
			issues.push({
				severity: "error",
				code: "stub-skill",
				message: `Skill \`${skill.id}\` body is too shallow`,
				sourceId: skill.id,
			});
	}
	for (const route of source.routes)
		if (route.body.length < 200 || route.permissions.length < 6)
			issues.push({
				severity: "error",
				code: "stub-route",
				message: `Route \`${route.id}\` contract is too shallow`,
				sourceId: route.id,
			});
	for (const tool of source.tools)
		if (tool.body.length < 80)
			issues.push({
				severity: "error",
				code: "metadata-tool",
				message: `Tool \`${tool.id}\` is metadata-only or too shallow`,
				sourceId: tool.id,
			});
}
