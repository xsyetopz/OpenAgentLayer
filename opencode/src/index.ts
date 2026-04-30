export {
	AGENT_META,
	ALL_AGENT_ROLES,
	PRIMARY_AGENTS,
	SUBAGENT_ROLES,
} from "./agents.ts";
export { COMMAND_DEFINITIONS } from "./commands.ts";
export { buildContextFiles } from "./context.ts";
export { detectProviders } from "./detect.ts";
export type { AgentAssignment, InstallReport } from "./install.ts";
export { install } from "./install.ts";
export type { AgentRole, ModelAssignment, ModelId } from "./models.ts";
export { MODELS, resolveModel } from "./models.ts";
export {
	buildMcpConfig,
	buildOpenCodeJsonc,
	mergeInstructions,
	mergeMcpConfig,
	parseJsonc,
	stringifyJsonc,
} from "./opencode-config.ts";
export type { ContentPlugin } from "./plugins.ts";
export {
	applyContentPlugins,
	BUILT_IN_PLUGINS,
	CONVENTIONS_PLUGIN,
	DEFAULT_PLUGINS,
	injectPreamble,
	PANTHEON_CORE_PLUGIN,
	resolvePlugins,
	SAFETY_GUARD_PLUGIN,
} from "./plugins.ts";
export {
	renderAgentFile,
	renderCommandFile,
	renderSkillFile,
} from "./render.ts";
export { loadSkillsFromDisk } from "./skills.ts";
export { loadAgentSystemPrompt, loadTemplateFile } from "./template.ts";
export type {
	AgentDefinition,
	AgentMode,
	AgentPermission,
	CommandDefinition,
	ContextFile,
	InstallOptions,
	InstallScope,
	Permission,
	PermissionPattern,
	PermissionValue,
	Plugin,
	ProviderAvailability,
	SkillDefinition,
} from "./types.ts";
