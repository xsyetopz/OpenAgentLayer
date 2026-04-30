import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { WritePlan } from "@openagentlayer/render";
import type { SourceGraph } from "@openagentlayer/types";

export async function createFixtureRoot(): Promise<string> {
	return await Bun.$`mktemp -d`.text().then((output) => output.trim());
}

export async function writeAgent(
	root: string,
	options: {
		readonly directory?: string;
		readonly id?: string;
		readonly primary?: boolean;
		readonly prompt?: string;
		readonly commands?: string;
		readonly policies?: string;
		readonly routeContract?: string;
		readonly surfaces?: string;
	} = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const directory = join(
		root,
		"source",
		options.directory ?? "agents/duplicate-one",
	);
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "prompt.md"),
		[
			"# Fixture Agent",
			"",
			"## Mission",
			"",
			"Exercise source graph validation and render behavior for tests.",
			"",
			"## Use when",
			"",
			"- Fixture tests need a complete agent prompt.",
			"",
			"## Operating rules",
			"",
			"- Stay scoped to fixture behavior.",
			"- Preserve explicit test inputs.",
			"",
			"## Evidence rules",
			"",
			"- Report concrete fixture validation evidence.",
			"",
			"## Output contract",
			"",
			"- Return fixture result and validation status.",
			"",
		].join("\n"),
	);
	await writeFile(
		join(directory, "agent.toml"),
		[
			`id = "${options.id ?? "fixture-agent"}"`,
			'kind = "agent"',
			'title = "Fixture Agent"',
			'role = "Fixture"',
			'description = "Fixture agent."',
			...(options.primary === undefined
				? []
				: [`primary = ${options.primary}`]),
			`prompt = "${options.prompt ?? "prompt.md"}"`,
			'mode = "both"',
			`route_contract = "${options.routeContract ?? "readonly"}"`,
			'handoff_contract = "result-evidence-blockers-files-next-action"',
			`commands = ${options.commands ?? "[]"}`,
			`policies = ${options.policies ?? "[]"}`,
			`surfaces = ${options.surfaces ?? '["codex"]'}`,
			"",
		].join("\n"),
	);
}

export async function writeModelPlan(
	root: string,
	options: {
		readonly id?: string;
		readonly surfaces?: string;
		readonly defaultModel?: string;
		readonly effort?: string;
		readonly assignedRole?: string;
		readonly assignedModel?: string;
		readonly assignedEffort?: string;
		readonly defaultPlan?: boolean;
		readonly extraAssignments?: string;
	} = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const id = options.id ?? "codex-plus";
	const directory = join(root, "source", "model-plans", id);
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "model-plan.toml"),
		[
			`id = "${id}"`,
			'kind = "model-plan"',
			'title = "Fixture Plan"',
			'description = "Fixture model plan."',
			`surfaces = ${options.surfaces ?? '["codex"]'}`,
			`default_plan = ${options.defaultPlan ?? true}`,
			`default_model = "${options.defaultModel ?? "gpt-5.4"}"`,
			`implementation_effort = "${options.effort ?? "medium"}"`,
			`plan_effort = "${options.effort ?? "medium"}"`,
			`review_effort = "${options.effort ?? "medium"}"`,
			`effort_ceiling = "${options.effort ?? "high"}"`,
			"long_context_routes = []",
			"",
			"[[role_assignments]]",
			`role = "${options.assignedRole ?? "fixture-agent"}"`,
			`model = "${options.assignedModel ?? options.defaultModel ?? "gpt-5.4"}"`,
			`effort = "${options.assignedEffort ?? options.effort ?? "medium"}"`,
			...(options.extraAssignments === undefined
				? []
				: ["", options.extraAssignments.trimEnd()]),
			"",
		].join("\n"),
	);
}

export async function writeSkill(
	root: string,
	options: {
		readonly compatibility?: string;
		readonly createSupportFile?: boolean;
		readonly description?: string;
		readonly directory?: string;
		readonly id?: string;
		readonly invocationMode?: string;
		readonly modelPolicy?: string;
		readonly supportFile?: string;
		readonly surfaces?: string;
		readonly userInvocable?: boolean;
	} = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const id = options.id ?? "fixture-skill";
	const directory = join(root, "source", options.directory ?? `skills/${id}`);
	await mkdir(directory, { recursive: true });
	if (
		options.supportFile !== undefined &&
		options.createSupportFile !== false &&
		!options.supportFile.startsWith("..")
	) {
		await mkdir(dirname(join(directory, options.supportFile)), {
			recursive: true,
		});
		await writeFile(join(directory, options.supportFile), "support\n");
	}
	await writeFile(
		join(directory, "SKILL.md"),
		[
			"# Fixture Skill",
			"",
			"Use this skill when fixture validation needs a complete skill body.",
			"",
			"## Procedure",
			"",
			"- Inspect the requested source record.",
			"- Report concrete validation evidence.",
			"",
		].join("\n"),
	);
	await writeFile(
		join(directory, "skill.toml"),
		[
			`id = "${id}"`,
			'kind = "skill"',
			'title = "Fixture Skill"',
			`description = "${options.description ?? "Fixture skill with complete procedural guidance."}"`,
			'body = "SKILL.md"',
			'license = "MIT"',
			`compatibility = "${options.compatibility ?? "Codex, Claude, and OpenCode skill surfaces."}"`,
			'allowed_tools = ["read", "search"]',
			'metadata = { origin = "fixture" }',
			`invocation_mode = "${options.invocationMode ?? "manual-or-route"}"`,
			`user_invocable = ${options.userInvocable ?? true}`,
			`model_policy = "${options.modelPolicy ?? "gpt-5.4"}"`,
			`supporting_files = ${options.supportFile === undefined ? "[]" : `["${options.supportFile}"]`}`,
			`surfaces = ${options.surfaces ?? '["codex"]'}`,
			"",
		].join("\n"),
	);
}

export async function writeCommand(
	root: string,
	options: {
		readonly arguments?: string;
		readonly aliases?: string;
		readonly createSupportFile?: boolean;
		readonly directory?: string;
		readonly hookPolicies?: string;
		readonly id?: string;
		readonly ownerRole?: string;
		readonly promptBody?: string;
		readonly requiredSkills?: string;
		readonly sideEffectLevel?: string;
		readonly supportFile?: string;
		readonly surfaceOverrides?: string;
		readonly surfaces?: string;
	} = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const id = options.id ?? "fixture-command";
	const directory = join(root, "source", options.directory ?? `commands/${id}`);
	await mkdir(directory, { recursive: true });
	if (
		options.supportFile !== undefined &&
		options.createSupportFile !== false &&
		!options.supportFile.startsWith("..")
	) {
		await mkdir(dirname(join(directory, options.supportFile)), {
			recursive: true,
		});
		await writeFile(join(directory, options.supportFile), "support\n");
	}
	await writeFile(
		join(directory, "prompt.md"),
		options.promptBody ??
			[
				"# Command",
				"",
				"Route `$ARGUMENTS` through the owning fixture agent.",
				"",
				"## Procedure",
				"",
				"- Parse the supplied arguments.",
				"- Return concrete validation evidence.",
				"",
			].join("\n"),
	);
	await writeFile(
		join(directory, "command.toml"),
		[
			`id = "${id}"`,
			'kind = "command"',
			'title = "Fixture Command"',
			'description = "Fixture command."',
			`owner_role = "${options.ownerRole ?? "fixture-agent"}"`,
			'route_contract = "readonly"',
			`aliases = ${options.aliases ?? "[]"}`,
			'prompt_template = "prompt.md"',
			`arguments = ${options.arguments ?? '["objective"]'}`,
			'argument_schema = { objective = "string" }',
			'invocation = "user"',
			`side_effect_level = "${options.sideEffectLevel ?? "none"}"`,
			`surface_overrides = ${options.surfaceOverrides ?? "{}"}`,
			`hook_policies = ${options.hookPolicies ?? "[]"}`,
			`required_skills = ${options.requiredSkills ?? "[]"}`,
			`supporting_files = ${options.supportFile === undefined ? "[]" : `["${options.supportFile}"]`}`,
			`surfaces = ${options.surfaces ?? '["codex"]'}`,
			"",
			"[[examples]]",
			'title = "Fixture route"',
			'invocation = "fixture-command demo"',
			'notes = "Exercises command metadata."',
			"",
		].join("\n"),
	);
}

export async function writePolicy(
	root: string,
	options: {
		readonly hookEventCategory?: string;
		readonly id?: string;
		readonly runtimeScript?: string;
		readonly surfaceEvents?: string;
		readonly surfaceMappings?: string;
		readonly surfaces?: string;
	} = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const id = options.id ?? "fixture-policy";
	const directory = join(root, "source", "policies", id);
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "policy.toml"),
		[
			`id = "${id}"`,
			'kind = "policy"',
			'title = "Fixture Policy"',
			'description = "Fixture policy."',
			'category = "completion_gate"',
			'severity = "error"',
			'event_intent = "completion"',
			`hook_event_category = "${options.hookEventCategory ?? "completion"}"`,
			...(options.runtimeScript === ""
				? []
				: [
						`runtime_script = "${options.runtimeScript ?? `runtime/${id}.mjs`}"`,
					]),
			`surface_events = ${options.surfaceEvents ?? '["Stop"]'}`,
			"test_payloads = []",
			"tests = []",
			`surfaces = ${options.surfaces ?? '["codex"]'}`,
			"",
			`surface_mappings = ${options.surfaceMappings ?? '{ codex = "Stop" }'}`,
			"",
		].join("\n"),
	);
}

export async function writeFixtureSurfaceConfigs(root: string): Promise<void> {
	await writeFixtureSurfaceConfig(root, "codex");
	await writeFixtureSurfaceConfig(root, "claude");
	await writeFixtureSurfaceConfig(root, "opencode");
}

async function writeFixtureSurfaceConfig(
	root: string,
	surface: "codex" | "claude" | "opencode",
): Promise<void> {
	const directory = join(root, "source", "surface-configs", surface);
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "surface-config.toml"),
		[
			`id = "${surface}-surface-config"`,
			'kind = "surface-config"',
			`title = "${surface} Surface Config"`,
			`description = "${surface} fixture surface config."`,
			`surface = "${surface}"`,
			`surfaces = ["${surface}"]`,
			'allowed_key_paths = ["*"]',
			"do_not_emit_key_paths = []",
			"validation_rules = []",
			"",
			"[project_defaults]",
			"",
			"[default_profile]",
			'profile_id = "fixture"',
			'placement = "generated-project-profile"',
			"emitted_key_paths = []",
			'source_url = "fixture"',
			'validation = "fixture"',
			"",
		].join("\n"),
	);
}

export function graphRecordKeys(graph: SourceGraph): readonly string[] {
	return graph.records.map((record) => `${record.kind}:${record.id}`);
}

export function writePlanActions(plan: WritePlan): readonly string[] {
	return plan.entries.map((entry) => `${entry.action}\t${entry.path}`);
}
