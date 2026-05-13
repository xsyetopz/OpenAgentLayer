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

export function agentPrompt(agent: AgentRecord, _source: OalSource): string {
	return [
		agent.prompt,
		"",
		"## Narrow Agent Contract",
		`Job: ${agent.role}.`,
		`Own routes: ${agent.routes.join(", ") || "none"}.`,
		`Use only these tools: ${agent.tools.join(", ")}.`,
		`Use these skills when relevant: ${agent.skills.join(", ")}.`,
		`Accept work when: ${agent.triggers.join("; ")}.`,
		`Refuse or hand back when: ${agent.nonGoals.join("; ")}.`,
		"Stay narrow: do not drift into adjacent route ownership, broad cleanup, generated-output edits, or orchestration unless explicitly assigned.",
		"Workspace consequence: unexplained existing changes are user-owned; do not revert, reformat, overwrite, move, stage, or commit them.",
		"Evidence consequence: behavior claims require source evidence and targeted validation when validation is justified.",
		"Output consequence: return changed behavior plus evidence, or `STATUS BLOCKED` with Attempted/Evidence/Need.",
	].join("\n");
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

${renderCodexAgentInvocation(source)}

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

function renderCodexAgentInvocation(source: OalSource): string {
	const agents = source.agents.filter((agent) =>
		agent.providers.includes("codex"),
	);
	if (agents.length === 0) return "";
	const roster = agents
		.map(
			(agent) =>
				`- ${agent.id}: aliases=${agentAliases(agent).join(", ")}; routes=${agent.routes.join(", ") || "none"}; role=${agent.role}`,
		)
		.join("\n");
	return `## Codex Subagents

- OAL treats native Codex subagents as the default path for broad or parallelizable work when multi_agent or multi_agent_v2 is enabled; users should not need to request them manually.
- Before starting broad work, split independent sidecar tasks and spawn rendered OAL agent names or aliases; each assignment must fit the configured job runtime cap. Keep a narrow single-owner fix local and record why.
- For coding implementation, prefer spawning the rendered GPT-5.3-Codex implementation agents such as hephaestus, daedalus, demeter, hecate, or prometheus when the work is significant or separable, instead of having the GPT-5.5 parent perform all edits.
- Use subagents for work that can split by ownership, provider, package, test tier, review perspective, documentation lookup, or repeated batch item; do not rely on lower GPT-5.5 reasoning effort as a cost control for constantly running goal loops when a cheaper worker model can own the task.
- Parent sessions own task split, agent launch, wait/merge, and final decision. Ask subagents for final evidence, changed paths, validation output, or a precise blocker; merge only their final summaries into the parent context.
- For many similar rows, create a CSV and use Codex batch subagents when available; each worker should return structured results to the parent.

Rendered OAL agent roster:
${roster}`;
}

function agentAliases(agent: AgentRecord): string[] {
	return [...new Set([agent.id, agent.name.toLowerCase(), ...agent.routes])];
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
