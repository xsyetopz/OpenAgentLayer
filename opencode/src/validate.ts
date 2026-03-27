const VALID_PERMISSION_KEYS = new Set([
	"read",
	"edit",
	"glob",
	"grep",
	"list",
	"bash",
	"task",
	"skill",
	"lsp",
	"todoread",
	"todowrite",
	"webfetch",
	"websearch",
	"codesearch",
	"external_directory",
	"doom_loop",
]);

const VALID_PERMISSION_VALUES = new Set(["allow", "ask", "deny"]);

const KEBAB_CASE_RE = /^[a-z][a-z0-9-]*$/;
const VERB_NOUN_RE = /^[a-z][a-z0-9]+-[a-z][a-z0-9-]*$/;

export interface ValidationError {
	type:
		| "permission_key"
		| "permission_value"
		| "namespace_conflict"
		| "agent_name"
		| "command_name";
	message: string;
}

export function validatePermissionKeys(
	permission: Record<string, unknown>,
	context: string,
): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const key of Object.keys(permission)) {
		if (!VALID_PERMISSION_KEYS.has(key)) {
			errors.push({
				type: "permission_key",
				message: `${context}: unknown permission key "${key}"`,
			});
		}
	}
	return errors;
}

function checkPatternMap(
	key: string,
	value: Record<string, unknown>,
	context: string,
): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const [pattern, perm] of Object.entries(value)) {
		if (typeof perm !== "string" || !VALID_PERMISSION_VALUES.has(perm)) {
			errors.push({
				type: "permission_value",
				message: `${context}: invalid value "${String(perm)}" for permission pattern "${pattern}" in "${key}"`,
			});
		}
	}
	return errors;
}

export function validatePermissionValues(
	permission: Record<string, unknown>,
	context: string,
): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const [key, value] of Object.entries(permission)) {
		if (typeof value === "string") {
			if (!VALID_PERMISSION_VALUES.has(value)) {
				errors.push({
					type: "permission_value",
					message: `${context}: invalid value "${value}" for permission "${key}"`,
				});
			}
		} else if (typeof value === "object" && value !== undefined) {
			errors.push(
				...checkPatternMap(key, value as Record<string, unknown>, context),
			);
		}
	}
	return errors;
}

export function validateNamespaceConflicts(
	agentNames: string[],
	commandNames: string[],
): ValidationError[] {
	const errors: ValidationError[] = [];
	const agentSet = new Set(agentNames);
	for (const cmd of commandNames) {
		if (agentSet.has(cmd)) {
			errors.push({
				type: "namespace_conflict",
				message: `Command name "${cmd}" conflicts with agent name "${cmd}"`,
			});
		}
	}
	return errors;
}

export function validateAgentNames(names: string[]): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const name of names) {
		if (!KEBAB_CASE_RE.test(name)) {
			errors.push({
				type: "agent_name",
				message: `Agent name "${name}" must be kebab-case`,
			});
		}
	}
	return errors;
}

export function validateCommandNames(names: string[]): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const name of names) {
		if (!VERB_NOUN_RE.test(name)) {
			errors.push({
				type: "command_name",
				message: `Command name "${name}" should use verb-noun pattern (e.g., run-review)`,
			});
		}
	}
	return errors;
}
