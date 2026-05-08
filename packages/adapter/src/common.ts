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
	productPromptContracts: renderAgentPromptContracts(source),
})}

Triggers: ${agent.triggers.join("; ")}
Route handoff signals: ${agent.nonGoals.join("; ")}
Tool contract: ${agent.tools.join(", ")}
Skill access: ${agent.skills.join(", ")}
Owned routes: ${agent.routes.join(", ")}
Owned route contracts:
${renderOwnedRouteContracts(agent, source)}
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

function renderAgentPromptContracts(source: OalSource): string {
	const contracts = source.promptContracts;
	if (!contracts) return "";
	return [
		"- Artifact target: produce a current-state patch; repository artifacts describe behavior that exists now.",
		"- Repository inspection: use rg/fd before broad reads; use git ls-files or git grep when tracked-file-only evidence is required.",
		"- Context discipline: classify the task area and name the owning package/module/route/provider surface before broad exploration; unrelated directories need a one-line reason tied to the task.",
		"- Navigation order: read package maps, local instructions, or source records before scanning implementation; use tracked inventories and bounded searches first.",
		"- Edit tools: use apply_patch for focused manual edits; use bounded python3 rewrites for broad mechanical changes when many patch hunks would be fragile, then inspect the final diff.",
		"- Edit envelope: derive ALLOWED_EDIT_SET from the user request and controlling source; docs, tests, comments, config, warnings, and guardrails enter the set through explicit request or current runtime/schema/security/validation need.",
		"- Consent boundary: examples, corrections, suggested names, and partial ideas are input evidence for the requested behavior only; compatibility, aliases, fallbacks, extra behavior, guardrails, docs, cleanup, and adjacent changes need explicit user request or controlling source requirement.",
		"- Naming source: create names from existing symbols, formal API/schema terms, user-supplied names, or current behavior; path labels are location metadata.",
		"- Correction transform: apply corrected current behavior inside ALLOWED_EDIT_SET; inferred compatibility enters only through explicit user request or controlling source requirement.",
		"- Removal transform: removed concepts become absence; current runtime behavior and explicitly requested history artifacts may carry needed text.",
		"- Diff gate: inspect final diff and repair added residue before final response.",
		"- Source evidence: inspect controlling source before claims; behavior changes need Source Evidence Map, Changed Behavior, and Validation Evidence.",
		"- Provider reload evidence: instruction reload semantics, skills reload semantics, and model/window semantics need current provider docs, provider source code, or validated runtime evidence before claims.",
		"- Stable vs evolving guidance: Keep stable invariants in provider instruction files; keep fast-changing workflows in skills, hooks, commands, or provider-native agents when the provider reload path supports them.",
		"- Correction discipline: verify before accepting a correction; separate checked facts from inference, and return STATUS BLOCKED with Attempted, Evidence, and Need when source truth is missing or contradictory.",
		"- Delegation check: broad implementation work uses subagents or the orchestrate route when ownership, providers, packages, test tiers, or investigation paths can split; narrow single-owner edits begin with a recorded solo ownership reason.",
		"- Continuity check: for multi-step work, keep a short user-visible Continuation Record with objective, done, next, and blockers; prefer current user messages and verified repo evidence over hidden memory files.",
		"- Boundaries: answer the requested task; extra guidance, alternatives, cleanup, and guardrails enter the answer through user request or validation need.",
		"- Blocker path: missing, ambiguous, or contradictory source truth returns STATUS BLOCKED with Attempted, Evidence, and Need.",
		renderCavemanContract(source),
	].join("\n");
}

function renderOwnedRouteContracts(
	agent: AgentRecord,
	source: OalSource,
): string {
	const routes = source.routes.filter((route) =>
		agent.routes.includes(route.id),
	);
	if (routes.length === 0) return "- none";
	return routes
		.map(
			(route) =>
				`- ${route.id}: permissions=${route.permissions}; arguments=${route.arguments}; skills=${route.skills.join(", ")}; ${route.body}`,
		)
		.join("\n");
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
