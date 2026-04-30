import type {
	AgentDefinition,
	CommandDefinition,
	Permission,
	SkillDefinition,
} from "./types.ts";

function renderPermissionValue(value: Permission, indent: string): string {
	if (typeof value === "string") {
		return value;
	}
	const lines: string[] = [""];
	for (const [pattern, perm] of Object.entries(value)) {
		lines.push(`${indent}  "${pattern}": ${perm}`);
	}
	return lines.join("\n");
}

function renderPermissions(
	permission: AgentDefinition["permission"],
	indent = "  ",
): string {
	const lines: string[] = [];
	for (const [key, value] of Object.entries(permission)) {
		if (value === undefined) {
			continue;
		}
		const rendered = renderPermissionValue(value as Permission, indent);
		if (typeof value === "string") {
			lines.push(`${indent}${key}: ${rendered}`);
		} else {
			lines.push(`${indent}${key}:${rendered}`);
		}
	}
	return lines.join("\n");
}

export function renderAgentFile(agent: AgentDefinition): string {
	const frontmatter: string[] = [
		"---",
		`description: ${agent.description}`,
		`mode: ${agent.mode}`,
		`model: ${agent.model}`,
	];
	if (agent.routeKind) {
		frontmatter.push(`routeKind: ${agent.routeKind}`);
	}

	if (agent.hidden !== undefined) {
		frontmatter.push(`hidden: ${agent.hidden}`);
	}
	if (agent.temperature !== undefined) {
		frontmatter.push(`temperature: ${agent.temperature}`);
	}
	if (agent.top_p !== undefined) {
		frontmatter.push(`top_p: ${agent.top_p}`);
	}
	if (agent.color !== undefined) {
		frontmatter.push(`color: ${agent.color}`);
	}
	if (agent.steps !== undefined) {
		frontmatter.push(`steps: ${agent.steps}`);
	}

	frontmatter.push("permission:");
	frontmatter.push(renderPermissions(agent.permission));
	frontmatter.push("---");
	frontmatter.push("");
	frontmatter.push(agent.systemPrompt.trim());
	frontmatter.push("");

	return frontmatter.join("\n");
}

export function renderCommandFile(command: CommandDefinition): string {
	const lines = [
		"---",
		`description: ${command.description}`,
		`agent: ${command.agent}`,
	];
	if (command.routeKind) {
		lines.push(`routeKind: ${command.routeKind}`);
	}
	if (command.model) {
		lines.push(`model: ${command.model}`);
	}
	if (command.subtask) {
		lines.push(`subtask: ${command.subtask}`);
	}
	lines.push("---", "", command.promptTemplate, "");
	return lines.join("\n");
}

export function renderSkillFile(skill: SkillDefinition): string {
	const frontmatter: string[] = [
		"---",
		`name: ${skill.name}`,
		`description: ${skill.description}`,
		"metadata:",
		`  version: "${skill.version}"`,
		"---",
		"",
		skill.content.trim(),
		"",
	];

	return frontmatter.join("\n");
}
