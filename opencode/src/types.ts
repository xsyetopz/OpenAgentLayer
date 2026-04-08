export type PermissionValue = "allow" | "ask" | "deny";
export type PermissionPattern = Record<string, PermissionValue>;
export type Permission = PermissionValue | PermissionPattern;

export interface AgentPermission {
	read?: Permission;
	edit?: Permission;
	glob?: Permission;
	grep?: Permission;
	list?: Permission;
	bash?: Permission;
	task?: Permission;
	skill?: Permission;
	lsp?: Permission;
	webfetch?: Permission;
	websearch?: Permission;
	codesearch?: Permission;
	todoread?: Permission;
	todowrite?: Permission;
	external_directory?: Permission;
	doom_loop?: Permission;
	[key: string]: Permission | undefined;
}

export type AgentMode = "primary" | "subagent" | "all";

export interface AgentDefinition {
	name: string;
	description: string;
	mode: AgentMode;
	model: string;
	hidden?: boolean;
	temperature?: number;
	top_p?: number;
	color?: string;
	permission: AgentPermission;
	steps?: number;
	variant?: string;
	options?: Record<string, unknown>;
	systemPrompt: string;
}

export interface CommandDefinition {
	name: string;
	description: string;
	agent: string;
	model?: string;
	subtask?: boolean;
	promptTemplate: string;
}

export interface SkillDefinition {
	name: string;
	description: string;
	version: string;
	content: string;
}

export type ProviderAvailability = {
	githubCopilot: boolean;
};

export type InstallScope = "project" | "global";

export interface InstallOptions {
	scope: InstallScope;
	clean: boolean;
	dryRun: boolean;
	noOverrides: boolean;
	plugins: string[];
	defaultModel?: string;
	modelOverrides?: Record<string, string>;
	providers?: ProviderAvailability;
}

export interface Plugin {
	name: string;
	description: string;
	applyToAgent?: (agent: AgentDefinition) => AgentDefinition;
	applyToCommand?: (command: CommandDefinition) => CommandDefinition;
	extraFiles?: () => Array<{ path: string; content: string }>;
}

export interface ContextFile {
	filename: string;
	content: string;
}

export interface InstructionFile {
	filename: string;
	content: string;
}
