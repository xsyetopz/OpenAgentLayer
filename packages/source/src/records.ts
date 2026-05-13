import type { ModelMap, Provider } from "./providers";

export interface AgentRecord {
	id: string;
	name: string;
	providers: Provider[];
	role: string;
	triggers: string[];
	nonGoals: string[];
	tools: string[];
	skills: string[];
	routes: string[];
	models: ModelMap;
	prompt?: string;
}

export interface SkillSupportFile {
	path: string;
	content?: string;
	source?: string;
	executable?: boolean;
}

export interface UpstreamSkillSource {
	path: string;
	verbatim: true;
}

export interface SkillRecord {
	id: string;
	title: string;
	providers: Provider[];
	description: string;
	body: string;
	upstream?: UpstreamSkillSource;
	supportFiles?: SkillSupportFile[];
}

export interface RouteRecord {
	id: string;
	providers: Provider[];
	agent: string;
	skills: string[];
	permissions: string;
	arguments: string;
	body: string;
}

export interface HookRecord {
	id: string;
	script: string;
	providers: Provider[];
	events: Partial<Record<Provider, string[]>>;
}

export interface ToolRecord {
	id: string;
	provider: Provider;
	description: string;
	body: string;
}

export type CavemanMode =
	| "off"
	| "lite"
	| "full"
	| "ultra"
	| "wenyan-lite"
	| "wenyan"
	| "wenyan-ultra";

export interface CavemanConfig {
	mode: CavemanMode;
}

export interface ProductSource {
	version: string;
	product: { name: "OpenAgentLayer"; shortName: "OAL" };
	caveman?: CavemanConfig;
	promptContracts?: ProductPromptContracts;
	promptTemplates?: ProductPromptTemplates;
}

export interface OalSource extends ProductSource {
	agents: AgentRecord[];
	skills: SkillRecord[];
	routes: RouteRecord[];
	hooks: HookRecord[];
	tools: ToolRecord[];
}

export interface ProductPromptContracts {
	rtkEfficiency: string;
	repoInspection: string;
	contextDiscipline: string;
	responseBoundaries: string;
	scopeDiscipline: string;
	sourceBackedBehavior: string;
	correctionDiscipline: string;
	delegationDiscipline: string;
	continuityDiscipline: string;
	accountabilityPressure: string;
	simplicityDiscipline: string;
	zenDiscipline: string;
}

export interface ProductPromptTemplates {
	agentPrompt: string;
	agentContract: string;
	skillContract: string;
	commandContract: string;
	instructions: string;
}
