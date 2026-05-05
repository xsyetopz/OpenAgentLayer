import { type Provider, supportedProviders } from "./providers";
import type {
	AgentRecord,
	HookRecord,
	ProductSource,
	RouteRecord,
	SkillRecord,
	ToolRecord,
} from "./records";

const PROVIDERS = new Set(supportedProviders());
const AGENT_SKILL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAVEMAN_MODES = new Set([
	"off",
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan",
	"wenyan-ultra",
]);

export function validateAgentRecord(record: AgentRecord): void {
	requireText(record.id, "agent id");
	requireText(record.name, `agent ${record.id} name`);
	requireProviderList(record.providers, `agent ${record.id}`);
	requireText(record.role, `agent ${record.id} role`);
	requireStringList(record.triggers, `agent ${record.id} triggers`);
	requireStringList(record.nonGoals, `agent ${record.id} nonGoals`);
	requireStringList(record.tools, `agent ${record.id} tools`);
	requireStringList(record.skills, `agent ${record.id} skills`);
	requireStringList(record.routes, `agent ${record.id} routes`);
	requireText(record.prompt, `agent ${record.id} prompt`);
}

export function validateSkillRecord(record: SkillRecord): void {
	validateSkillRecordShape(record, { allowHydratedSupportFiles: true });
	requireText(record.body, `skill ${record.id} body`);
	for (const supportFile of record.supportFiles ?? [])
		requireHydratedSupportContent(
			record.id,
			supportFile.path,
			supportFile.content,
		);
}

export function validateSkillRecordShape(
	record: SkillRecord,
	options: { allowHydratedSupportFiles?: boolean } = {},
): void {
	requireText(record.id, "skill id");
	if (!AGENT_SKILL_ID_PATTERN.test(record.id))
		throw new Error(
			`skill \`${record.id}\` id must use Agent Skills lowercase hyphen format.`,
		);
	requireText(record.title, `skill ${record.id} title`);
	requireProviderList(record.providers, `skill ${record.id}`);
	requireText(record.description, `skill ${record.id} description`);
	if (!record.upstream) requireText(record.body, `skill ${record.id} body`);
	if (record.upstream) {
		requireText(record.upstream.path, `skill ${record.id} upstream path`);
		if (record.upstream.verbatim !== true)
			throw new Error(`skill \`${record.id}\` upstream must be verbatim`);
	}
	for (const supportFile of record.supportFiles ?? []) {
		requireText(supportFile.path, `skill \`${record.id}\` support file path`);
		if (!isSkillSupportPath(supportFile.path))
			throw new Error(
				`skill \`${record.id}\` support file \`${supportFile.path}\` must live under scripts, references, or assets.`,
			);
		if (
			supportFile.content &&
			supportFile.source &&
			options.allowHydratedSupportFiles !== true
		)
			throw new Error(
				`skill \`${record.id}\` support file \`${supportFile.path}\` cannot define content and source.`,
			);
		if (!(supportFile.content || supportFile.source))
			throw new Error(
				`skill \`${record.id}\` support file \`${supportFile.path}\` needs content or source.`,
			);
		if (supportFile.content)
			requireText(
				supportFile.content,
				`skill \`${record.id}\` support file content`,
			);
		if (supportFile.source)
			requireText(
				supportFile.source,
				`skill \`${record.id}\` support file source`,
			);
	}
}

function isSkillSupportPath(path: string): boolean {
	const parts = path.split("/");
	return (
		parts.length === 2 &&
		["scripts", "references", "assets"].includes(parts[0] ?? "") &&
		parts.every((part) => part.length > 0 && !part.includes(".."))
	);
}

export function validateRouteRecord(record: RouteRecord): void {
	requireText(record.id, "route id");
	requireProviderList(record.providers, `route ${record.id}`);
	requireText(record.agent, `route ${record.id} agent`);
	requireStringList(record.skills, `route ${record.id} skills`);
	requireText(record.permissions, `route ${record.id} permissions`);
	requireText(record.arguments, `route ${record.id} arguments`);
	requireText(record.body, `route ${record.id} body`);
}

export function validateHookRecord(record: HookRecord): void {
	requireText(record.id, "hook id");
	requireText(record.script, `hook ${record.id} script`);
	requireProviderList(record.providers, `hook ${record.id}`);
	for (const provider of Object.keys(record.events))
		if (!PROVIDERS.has(provider as Provider))
			throw new Error(
				`hook \`${record.id}\` needs supported event provider \`${provider}\``,
			);
}

export function validateToolRecord(record: ToolRecord): void {
	requireText(record.id, "tool id");
	requireProvider(record.provider, `tool ${record.id}`);
	requireText(record.description, `tool ${record.id} description`);
	requireText(record.body, `tool ${record.id} body`);
}

export function validateProductSource(record: ProductSource): void {
	if (record.caveman) {
		if (!CAVEMAN_MODES.has(record.caveman.mode))
			throw new Error(
				`Product caveman mode \`${String(record.caveman.mode)}\` needs a supported value`,
			);
	}
	if (
		record.product?.name !== "OpenAgentLayer" ||
		record.product?.shortName !== "OAL"
	)
		throw new Error("Product source must identify OpenAgentLayer/OAL");
	if (record.promptContracts) {
		requireText(
			record.promptContracts.rtkEfficiency,
			"product promptContracts.rtkEfficiency",
		);
		requireText(
			record.promptContracts.repoInspection,
			"product promptContracts.repoInspection",
		);
		requireText(
			record.promptContracts.responseBoundaries,
			"product promptContracts.responseBoundaries",
		);
		requireText(
			record.promptContracts.scopeDiscipline,
			"product promptContracts.scopeDiscipline",
		);
		requireText(
			record.promptContracts.sourceBackedBehavior,
			"product promptContracts.sourceBackedBehavior",
		);
		requireText(
			record.promptContracts.correctionDiscipline,
			"product promptContracts.correctionDiscipline",
		);
		requireText(
			record.promptContracts.accountabilityPressure,
			"product promptContracts.accountabilityPressure",
		);
		requireText(
			record.promptContracts.simplicityDiscipline,
			"product promptContracts.simplicityDiscipline",
		);
	}
	if (record.promptTemplates) {
		requireText(
			record.promptTemplates.agentContract,
			"product promptTemplates.agentContract",
		);
		requireText(
			record.promptTemplates.skillContract,
			"product promptTemplates.skillContract",
		);
		requireText(
			record.promptTemplates.commandContract,
			"product promptTemplates.commandContract",
		);
		requireText(
			record.promptTemplates.instructions,
			"product promptTemplates.instructions",
		);
		requireText(
			record.promptTemplates.codexBaseline,
			"product promptTemplates.codexBaseline",
		);
	}
}

function requireProviderList(value: Provider[], label: string): void {
	if (!Array.isArray(value) || value.length === 0)
		throw new Error(`\`${label}\` providers must be a non-empty array`);
	for (const provider of value) requireProvider(provider, label);
}

function requireProvider(value: Provider, label: string): void {
	if (!PROVIDERS.has(value))
		throw new Error(
			`\`${label}\` needs supported provider \`${String(value)}\``,
		);
}

function requireStringList(value: string[], label: string): void {
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		value.some((entry) => typeof entry !== "string" || entry.length === 0)
	)
		throw new Error(`\`${label}\` must be a non-empty string array`);
}

function requireText(value: string, label: string): void {
	if (typeof value !== "string" || value.trim().length === 0)
		throw new Error(`\`${label}\` must be a non-empty string`);
}

function requireHydratedSupportContent(
	skillId: string,
	path: string,
	content: string | undefined,
): void {
	if (content) return;
	throw new Error(
		`skill \`${skillId}\` support file \`${path}\` was not hydrated.`,
	);
}
