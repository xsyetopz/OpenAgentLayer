interface CodexProfile {
	model?: string;
	approval_policy?: string;
	sandbox_mode?: string;
	model_instructions_file?: string;
	zsh_path?: string;
	model_reasoning_effort?: string;
	plan_mode_reasoning_effort?: string;
	model_verbosity?: string;
	tools_view_image?: boolean;
}

interface CodexToml {
	profile?: string;
	approvals_reviewer?: string;
	memories: Record<string, unknown>;
	profiles: Record<string, CodexProfile>;
	features: Record<string, Record<string, unknown>>;
	agents: Record<string, unknown>;
	plugins: Record<string, { enabled?: boolean }>;
}

const TOML_INTEGER_PATTERN = /^\d+$/;

const ALLOWED_CODEX_MODELS = new Set([
	"gpt-5.5",
	"gpt-5.4-mini",
	"gpt-5.2",
	"gpt-5.3-codex",
]);
const ALLOWED_APPROVAL_POLICIES = new Set(["on-request", "never"]);
const ALLOWED_SANDBOX_MODES = new Set(["workspace-write", "read-only"]);
const ALLOWED_CODEX_FEATURES = new Set([
	"steer",
	"apps",
	"tui_app_server",
	"memories",
	"sqlite",
	"plugins",
	"hooks",
	"shell_zsh_fork",
	"goals",
	"responses_websockets",
	"responses_websockets_v2",
	"unified_exec",
	"enable_fanout",
	"multi_agent",
	"multi_agent_v2",
	"shell_snapshot",
	"collaboration_modes",
	"codex_git_commit",
	"fast_mode",
	"undo",
	"js_repl",
]);
const ALLOWED_CLAUDE_MODELS = new Set([
	"claude-opus-4-6",
	"claude-opus-4-6[1m]",
	"claude-sonnet-4-6",
	"claude-haiku-4-5",
]);
const ALLOWED_OPENCODE_PERMISSION_VALUES = new Set(["allow", "ask", "deny"]);

export function assertCodexTomlSchema(toml: string): void {
	const parsed = parseCodexToml(toml);
	if (!parsed.profile?.startsWith("openagentlayer"))
		throw new Error("Codex config does not activate OAL profile");
	if (!parsed.profiles[parsed.profile])
		throw new Error("Codex config active profile is not rendered");
	if (parsed.approvals_reviewer !== "auto_review")
		throw new Error("Codex config does not enable auto approval review");
	if (parsed.memories["extract_model"] !== "gpt-5.4-mini")
		throw new Error("Codex memories.extract_model must use gpt-5.4-mini");
	if (parsed.plugins["oal@openagentlayer-local"]?.enabled !== true)
		throw new Error("Codex config does not activate $oal plugin");
	for (const [profileName, profile] of Object.entries(parsed.profiles)) {
		if (!(profile.model && ALLOWED_CODEX_MODELS.has(profile.model)))
			throw new Error(
				`Codex profile ${profileName} has unsupported model ${profile.model}`,
			);
		if (
			profile.approval_policy &&
			!ALLOWED_APPROVAL_POLICIES.has(profile.approval_policy)
		)
			throw new Error(
				`Codex profile ${profileName} has unsupported approval policy ${profile.approval_policy}`,
			);
		if (
			profile.sandbox_mode &&
			!ALLOWED_SANDBOX_MODES.has(profile.sandbox_mode)
		)
			throw new Error(
				`Codex profile ${profileName} has unsupported sandbox mode ${profile.sandbox_mode}`,
			);
		if (profile.zsh_path)
			throw new Error(
				`Codex profile \`${profileName}\` should use normal shell`,
			);
		if (profile.model_verbosity && profile.model_verbosity !== "low")
			throw new Error(
				`Codex profile ${profileName} has unsupported verbosity ${profile.model_verbosity}`,
			);
	}
	for (const [profileName, features] of Object.entries(parsed.features)) {
		for (const [feature, value] of Object.entries(features)) {
			if (!ALLOWED_CODEX_FEATURES.has(feature))
				throw new Error(
					`Codex profile ${profileName} emits unsupported feature ${feature}`,
				);
			if (feature === "multi_agent_v2") assertMultiAgentV2Feature(value);
			else if (typeof value !== "boolean")
				throw new Error(`Codex feature \`${feature}\` is not boolean`);
		}
	}
	if (!parsed.agents["max_depth"])
		throw new Error("Codex agents table missing max_depth setting");
	if (
		"interrupt_message" in parsed.agents &&
		typeof parsed.agents["interrupt_message"] !== "boolean"
	)
		throw new Error("Codex agents.interrupt_message must be boolean");
}

export function assertClaudeSettingsSchema(settings: unknown): void {
	const object = asRecord(settings, "Claude settings");
	if (!ALLOWED_CLAUDE_MODELS.has(asString(object["model"], "Claude model")))
		throw new Error("Claude settings model is not allowlisted");
	const permissions = asRecord(object["permissions"], "Claude permissions");
	for (const key of ["allow", "ask", "deny"])
		if (!Array.isArray(permissions[key]))
			throw new Error(`Claude permissions.\`${key}\` must be an array`);
	const hooks = asRecord(object["hooks"], "Claude hooks");
	for (const groups of Object.values(hooks)) {
		if (!Array.isArray(groups))
			throw new Error("Claude hook groups must be arrays");
		for (const group of groups) {
			const record = asRecord(group, "Claude hook group");
			const handlers = record["hooks"];
			if (!Array.isArray(handlers))
				throw new Error("Claude hook group hooks must be arrays");
			for (const handler of handlers) {
				const hook = asRecord(handler, "Claude hook handler");
				if (hook["type"] !== "command")
					throw new Error("Claude hooks must use command handlers");
				if (!asString(hook["command"], "Claude hook command").endsWith(".mjs"))
					throw new Error("Claude hook command must reference .mjs script");
			}
		}
	}
}

export function assertOpenCodeConfigSchema(config: unknown): void {
	const object = asRecord(config, "OpenCode config");
	for (const key of ["model", "small_model", "default_agent"])
		asString(object[key], `OpenCode ${key}`);
	const permission = asRecord(object["permission"], "OpenCode permission");
	for (const [tool, value] of Object.entries(permission))
		if (!ALLOWED_OPENCODE_PERMISSION_VALUES.has(String(value)))
			throw new Error(
				`OpenCode permission ${tool} has invalid value ${String(value)}`,
			);
	const agents = asRecord(object["agent"], "OpenCode agent");
	if (!agents[asString(object["default_agent"], "OpenCode default_agent")])
		throw new Error("OpenCode default_agent does not exist in agent map");
	const commands = asRecord(object["command"], "OpenCode command");
	for (const [name, command] of Object.entries(commands)) {
		const record = asRecord(command, `OpenCode command ${name}`);
		if (!agents[asString(record["agent"], `OpenCode command ${name} agent`)])
			throw new Error(`OpenCode command \`${name}\` references missing agent`);
	}
	if (!Array.isArray(object["plugin"]))
		throw new Error("OpenCode plugin must be an array");
	if (!Array.isArray(object["instructions"]))
		throw new Error("OpenCode instructions must be an array");
}

function parseCodexToml(toml: string): CodexToml {
	const parsed: CodexToml = {
		memories: {},
		profiles: {},
		features: {},
		agents: {},
		plugins: {},
	};
	let section = "";
	for (const rawLine of toml.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0 || line.startsWith("#")) continue;
		if (line.startsWith("[") && line.endsWith("]")) {
			section = line.slice(1, -1);
			continue;
		}
		if (section === "hooks") continue;
		const [key, rawValue] = splitAssignment(line);
		const value = parseTomlValue(rawValue);
		if (section.startsWith("profiles.") && section.endsWith(".features")) {
			const profile = section.split(".")[1] ?? "";
			parsed.features[profile] ??= {};
			parsed.features[profile][key] = value;
		} else if (section === "features") {
			parsed.features[""] ??= {};
			parsed.features[""][key] = value;
		} else if (section.startsWith("profiles.")) {
			const profile = section.split(".")[1] ?? "";
			parsed.profiles[profile] ??= {};
			parsed.profiles[profile][key as keyof CodexProfile] = value as never;
		} else if (section === "agents") {
			parsed.agents[key] = value;
		} else if (section === "memories") {
			parsed.memories[key] = value;
		} else if (section.startsWith('plugins."')) {
			const plugin = section.slice('plugins."'.length, -1);
			parsed.plugins[plugin] ??= {};
			parsed.plugins[plugin][key as "enabled"] = value as boolean;
		} else if (section === "") {
			if (key === "profile") parsed.profile = value as string;
			if (key === "approvals_reviewer")
				parsed.approvals_reviewer = value as string;
		}
	}
	return parsed;
}

function splitAssignment(line: string): [string, string] {
	const index = line.indexOf("=");
	if (index < 1) throw new Error(`Invalid TOML assignment: \`${line}\``);
	return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
}

function assertMultiAgentV2Feature(value: unknown): void {
	if (typeof value === "boolean") return;
	const record = asRecord(value, "Codex multi_agent_v2 feature");
	if (record["enabled"] !== true)
		throw new Error("Codex multi_agent_v2 object must set enabled = true");
	if (
		"max_concurrent_threads_per_session" in record &&
		!(typeof record["max_concurrent_threads_per_session"] === "number")
	)
		throw new Error(
			"Codex multi_agent_v2 max_concurrent_threads_per_session must be numeric",
		);
}

function parseTomlValue(
	rawValue: string,
): string | boolean | number | Record<string, unknown> {
	const value = stripTomlComment(rawValue);
	if (value === "true") return true;
	if (value === "false") return false;
	if (TOML_INTEGER_PATTERN.test(value)) return Number(value);
	if (value.startsWith('"') && value.endsWith('"'))
		return JSON.parse(value) as string;
	if (value.startsWith("{") && value.endsWith("}"))
		return parseTomlInlineTable(value);
	return value;
}

function parseTomlInlineTable(value: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const body = value.slice(1, -1).trim();
	if (!body) return result;
	for (const entry of splitInlineTableEntries(body)) {
		const [key, rawEntryValue] = splitAssignment(entry.trim());
		result[key] = parseTomlValue(rawEntryValue);
	}
	return result;
}

function splitInlineTableEntries(body: string): string[] {
	const entries: string[] = [];
	let current = "";
	let isQuoted = false;
	let isEscaped = false;
	for (const character of body) {
		if (isEscaped) {
			current += character;
			isEscaped = false;
			continue;
		}
		if (character === "\\") {
			current += character;
			isEscaped = true;
			continue;
		}
		if (character === '"') isQuoted = !isQuoted;
		if (character === "," && !isQuoted) {
			entries.push(current);
			current = "";
			continue;
		}
		current += character;
	}
	if (current.trim()) entries.push(current);
	return entries;
}

function stripTomlComment(rawValue: string): string {
	let isQuoted = false;
	let isEscaped = false;
	for (let index = 0; index < rawValue.length; index += 1) {
		const character = rawValue[index];
		if (isEscaped) {
			isEscaped = false;
			continue;
		}
		if (character === "\\") {
			isEscaped = true;
			continue;
		}
		if (character === '"') {
			isQuoted = !isQuoted;
			continue;
		}
		if (character === "#" && !isQuoted) return rawValue.slice(0, index).trim();
	}
	return rawValue.trim();
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value))
		return value as Record<string, unknown>;
	throw new Error(`\`${label}\` must be an object`);
}

function asString(value: unknown, label: string): string {
	if (typeof value === "string" && value.length > 0) return value;
	throw new Error(`\`${label}\` must be a non-empty string`);
}
