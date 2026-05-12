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

${renderTemplate(source, "agentContract", {})}

Triggers: ${agent.triggers.join("; ")}
Route handoff signals: ${agent.nonGoals.join("; ")}
Tool contract: ${agent.tools.join(", ")}
Skill access: ${agent.skills.join(", ")}
Owned routes: ${agent.routes.join(", ")}
Final output must include concrete evidence or a precise blocker.`;
}

export function skillMarkdown(skill: SkillRecord, source: OalSource): string {
	return `---\nname: ${skill.id}\ndescription: ${quoteToml(skill.description)}\n---\n# ${skill.title}\n\n${skill.body}\n\n${renderTemplate(
		source,
		"skillContract",
		{
			supportFiles: renderSkillSupportFiles(skill),
		},
	)}\n`;
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
	const rendered = renderTemplate(source, "instructions", {
		provider,
		routes: sourceRoutes
			.filter((route) => route.providers.includes(provider))
			.map(
				(route) =>
					`- ${route.id}: owner=${route.agent}; permissions=${route.permissions}; skills=${route.skills.join(", ")}`,
			)
			.join("\n"),
	});
	if (provider !== "codex") return rendered;
	return `${rendered}

## Codex Base Instructions

- \`.codex/openagentlayer/codex-base-instructions.md\` is rendered from upstream \`openai/codex\` \`default.md\` plus the tracked OAL patch; treat it as the Codex base-instruction surface for this AGENTS.md block.`;
}

export function camelCase(text: string): string {
	return text.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function renderProductPromptContracts(source: OalSource): string {
	const contracts = source.promptContracts;
	if (!contracts) return "";
	return [
		`- ${contracts.rtkEfficiency}`,
		`- ${contracts.repoInspection}`,
		`- ${contracts.contextDiscipline}`,
		`- ${contracts.responseBoundaries}`,
		`- ${contracts.scopeDiscipline}`,
		`- ${contracts.sourceBackedBehavior}`,
		`- ${contracts.correctionDiscipline}`,
		`- ${contracts.delegationDiscipline}`,
		`- ${contracts.continuityDiscipline}`,
		`- ${contracts.accountabilityPressure}`,
		`- ${contracts.simplicityDiscipline}`,
		renderCavemanContract(source),
	].join("\n");
}

function renderCavemanContract(source: OalSource): string {
	const mode = source.caveman?.mode ?? "off";
	if (mode === "off")
		return "- Caveman mode: off. Answer normally; user-invoked Caveman output activates compression.";
	return `- Caveman mode: ${mode}. Compress assistant prose according to this mode while preserving code, commands, paths, URLs, exact errors, versions, commit messages, review findings, and file contents.`;
}

function renderSkillSupportFiles(skill: SkillRecord): string {
	const supportFiles = skill.supportFiles ?? [];
	if (supportFiles.length === 0)
		return "No bundled support files. Use the main instructions only.";
	return supportFiles
		.map((supportFile) => {
			const action = supportFile.path.startsWith("scripts/")
				? "Run when useful"
				: supportFile.path.startsWith("assets/")
					? "Use as template"
					: "Read when needed";
			return `- ${supportFile.path}: ${action}.`;
		})
		.join("\n");
}

function renderTemplate(
	source: OalSource,
	name: keyof NonNullable<OalSource["promptTemplates"]>,
	values: Record<string, string>,
): string {
	const template = source.promptTemplates?.[name];
	if (!template)
		throw new Error(`OAL prompt template \`${name}\` was not loaded`);
	return Object.entries(values)
		.reduce(
			(content, [key, value]) => content.replaceAll(`{{ ${key} }}`, value),
			template,
		)
		.trimEnd();
}
