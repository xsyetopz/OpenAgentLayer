import type {
	AgentRecord,
	OalSource,
	Provider,
	RouteRecord,
	SkillRecord,
} from "@openagentlayer/source";

export function quoteToml(text: string): string {
	return JSON.stringify(text);
}

export function agentPrompt(agent: AgentRecord, source: OalSource): string {
	return `${agent.prompt}

${renderTemplate(source, "agentContract", {
	productPromptContracts: renderProductPromptContracts(source),
})}

Triggers: ${agent.triggers.join("; ")}
Do not use for: ${agent.nonGoals.join("; ")}
Tool contract: ${agent.tools.join(", ")}
Skill access: ${agent.skills.join(", ")}
Owned routes: ${agent.routes.join(", ")}
Final output must include concrete evidence or a precise blocker.`;
}

export function skillMarkdown(skill: SkillRecord, source: OalSource): string {
	return `---\ndescription: ${skill.description}\n---\n# ${skill.title}\n\n${skill.body}\n\n${renderTemplate(source, "skillContract", {})}\n`;
}

export function commandMarkdown(route: RouteRecord, source: OalSource): string {
	return `# ${route.id}\n\nOwner: ${route.agent}\nPermissions: ${route.permissions}\nArguments: ${route.arguments}\nRequired skills: ${route.skills.join(", ")}\n\n${route.body}\n\n${renderTemplate(
		source,
		"commandContract",
		{
			productPromptContracts: renderProductPromptContracts(source),
		},
	)}\n`;
}

export function instructions(
	source: OalSource,
	sourceRoutes: RouteRecord[],
	provider: Provider,
): string {
	return renderTemplate(source, "instructions", {
		provider,
		providerBaseline:
			provider === "codex" ? renderTemplate(source, "codexBaseline", {}) : "",
		productPromptContracts: renderProductPromptContracts(source),
		routes: sourceRoutes
			.filter((route) => route.providers.includes(provider))
			.map((route) => `- ${route.id}: ${route.body}`)
			.join("\n"),
	});
}

export function camelCase(text: string): string {
	return text.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function renderProductPromptContracts(source: OalSource): string {
	const contracts = source.promptContracts;
	if (!contracts) return "";
	return [
		`- ${contracts.rtkEfficiency}`,
		`- ${contracts.responseBoundaries}`,
		`- ${contracts.sourceBackedBehavior}`,
		`- ${contracts.accountabilityPressure}`,
		`- ${contracts.simplicityDiscipline}`,
	].join("\n");
}

function renderTemplate(
	source: OalSource,
	name: keyof NonNullable<OalSource["promptTemplates"]>,
	values: Record<string, string>,
): string {
	const template = source.promptTemplates?.[name];
	if (!template) throw new Error(`OAL prompt template ${name} was not loaded.`);
	return Object.entries(values)
		.reduce(
			(content, [key, value]) => content.replaceAll(`{{ ${key} }}`, value),
			template,
		)
		.trimEnd();
}
