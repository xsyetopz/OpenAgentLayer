import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import { validateHookMappings } from "../hook-mappings";
import { composeAgentPrompt, composeModelInstructions } from "../prompts";
import type { JsonObject, SourceFile, SourceGraph } from "../source";
import {
	OalError,
	readJsonFile,
	readTextFile,
	stableStringify,
} from "../source";
import {
	asJsonObject,
	type CapabilityReport,
	type DetectResult,
	type DoctorResult,
	jsonPayload,
	type PlatformAdapter,
	type RenderedPayload,
	statusMap,
} from "./types";

export const codexAdapter: PlatformAdapter = {
	capabilities(graph: SourceGraph): CapabilityReport {
		const platform = platformFor(graph);
		const surfaces = statusMap(platform.data["native_surfaces"] as string[]);
		surfaces["mcp"] = "manual";
		surfaces["model_routes"] = "manual";
		return {
			platform: "codex",
			surfaces,
		};
	},
	detect(root: string, graph: SourceGraph): DetectResult {
		const config = configFor(graph);
		return {
			available: Boolean(Bun.which(String(config.data["binary"]))),
			binary: String(config.data["binary"]),
			config_root: "~/.codex",
			platform: "codex",
			project_root: existsSync(root) ? root : resolve(root),
		};
	},
	doctorHooks(root: string, graph: SourceGraph): DoctorResult {
		const platformEvents = asJsonObject(
			graph.hookEvents.data["platform_events"],
		);
		const checks = graph.hooks.flatMap((hook) => [
			...validateHookMappings(
				hook,
				graph.hookEvents,
				Object.keys(platformEvents),
			),
			...validateCodexHookRuntime(root, hook),
		]);
		return {
			checks,
			ok: checks.every((check) => check.ok),
			platform: "codex",
		};
	},
	id: "codex",
	render(root: string, graph: SourceGraph): RenderedPayload[] {
		const config = configFor(graph);
		const schemaUrl = codexConfigSchemaUrl(graph);
		const projectConfig = codexProjectConfigObject(graph, config);
		const userConfig = codexUserConfigObject(config);
		validateCodexConfig(
			root,
			projectConfig,
			"generated/codex/.codex/config.toml",
			config.path,
			schemaUrl,
		);
		validateCodexConfig(
			root,
			userConfig,
			"generated/codex/user/config.toml",
			config.path,
			schemaUrl,
		);
		return [
			{
				content: renderAgentsMd(graph),
				path: "codex/AGENTS.md",
				sourcePaths: [
					"source/oal.json",
					...graph.agents.map((agent) => agent.path),
				],
			},
			{
				content: composeModelInstructions(graph),
				path: "codex/.codex/model-instructions.md",
				sourcePaths: [
					...graph.workflows.map((workflow) => workflow.path),
					...graph.promptModules.map((module) => module.path),
				],
			},
			...graph.agents.map((agent) => ({
				content: renderCodexAgentToml(graph, agent),
				path: `codex/.codex/agents/${agent.data["id"]}.toml`,
				sourcePaths: [
					agent.path,
					String(agent.data["prompt_path"]),
					...graph.promptModules.map((module) => module.path),
				],
			})),
			...graph.skills.map((skill) => ({
				content: renderCodexSkill(graph, skill),
				path: `codex/.agents/skills/${skill.data["id"]}/SKILL.md`,
				sourcePaths: [skill.path, String(skill.data["body_path"])],
			})),
			...graph.hooks.map((hook) =>
				jsonPayload(`hooks/${hook.data["id"]}.json`, hook.data, [hook.path]),
			),
			...graph.hooks
				.filter((hook) => codexHookMapping(hook))
				.map((hook) => renderCodexHookRuntime(root, hook)),
			{
				content: toToml(projectConfig),
				path: "codex/.codex/config.toml",
				sourcePaths: [config.path],
			},
			{
				content: toToml(userConfig),
				path: "codex/user/config.toml",
				sourcePaths: [config.path],
			},
		];
	},
};

function renderCodexSkill(graph: SourceGraph, skill: SourceFile): string {
	const body = skillBodyFor(graph, skill).data.trim();
	return [
		"---",
		`name: ${skill.data["id"]}`,
		`description: ${String(skill.data["description"]).replaceAll("\n", " ")}`,
		"---",
		"",
		body,
		"",
	].join("\n");
}

function skillBodyFor(
	graph: SourceGraph,
	skill: SourceFile,
): SourceFile<string> {
	const bodyPath = String(skill.data["body_path"]);
	const body = graph.skillBodies.find((file) => file.path === bodyPath);
	if (!body) {
		throw new Error(`${bodyPath} is required`);
	}
	return body;
}

function configFor(graph: SourceGraph): SourceFile {
	const config = graph.platformConfigs.find(
		(file) => file.data["platform"] === "codex",
	);
	if (!config) {
		throw new Error("source/platforms/codex/config.json is required");
	}
	return config;
}

function renderCodexAgentToml(graph: SourceGraph, agent: SourceFile): string {
	const prompt = composeAgentPrompt(graph, agent, "Codex");
	const profile = codexProfileFor(graph, agent);
	return [
		`name = ${formatTomlValue(agent.data["id"])}`,
		`description = ${formatTomlValue(agent.data["role"])}`,
		`model = ${formatTomlValue(profile["model"])}`,
		`model_reasoning_effort = ${formatTomlValue(profile["effort"])}`,
		`sandbox_mode = ${formatTomlValue(agentSandboxMode(agent))}`,
		`developer_instructions = ${formatTomlMultilineString(prompt)}`,
		"",
	].join("\n");
}

function agentSandboxMode(agent: SourceFile): string {
	const route = String(agent.data["model_route"]);
	if (["research", "plan", "review", "classify_contract"].includes(route)) {
		return "read-only";
	}
	return "workspace-write";
}

function codexProfileFor(graph: SourceGraph, agent: SourceFile): JsonObject {
	const config = configFor(graph);
	const defaultTier = String(
		asJsonObject(config.data["subscription"])["default"],
	);
	const defaults = asJsonObject(config.data["profile_defaults"]);
	const profile = asJsonObject(defaults[defaultTier]);
	const agents = asJsonObject(profile["agents"]);
	return asJsonObject(agents[String(agent.data["id"])]);
}

function platformFor(graph: SourceGraph): SourceFile {
	const platform = graph.platforms.find((file) => file.data["id"] === "codex");
	if (!platform) {
		throw new Error("source/platforms/codex/platform.json is required");
	}
	return platform;
}

function codexProjectConfigObject(
	graph: SourceGraph,
	config: SourceFile,
): JsonObject {
	return {
		...asJsonObject(config.data["required_config"]),
		hooks: codexHookConfig(graph),
	};
}

function codexUserConfigObject(config: SourceFile): JsonObject {
	return asJsonObject(config.data["user_config"]);
}

function codexHookConfig(graph: SourceGraph): JsonObject {
	const events: JsonObject = {};
	for (const hook of graph.hooks) {
		const mapping = codexHookMapping(hook);
		if (!mapping) {
			continue;
		}
		for (const event of mapping["events"] as string[]) {
			const groups = (events[event] as JsonObject[] | undefined) ?? [];
			const handler: JsonObject = {
				command: codexHookCommand(hook),
				type: "command",
			};
			if (mapping["status_message"] !== undefined) {
				handler["statusMessage"] = mapping["status_message"];
			}
			if (mapping["timeout_seconds"] !== undefined) {
				handler["timeout"] = mapping["timeout_seconds"];
			}
			const group: JsonObject = {
				hooks: [handler],
			};
			if (mapping["matcher"] !== undefined) {
				group["matcher"] = mapping["matcher"];
			}
			groups.push({
				...group,
			});
			events[event] = groups;
		}
	}
	return events;
}

function codexHookMapping(hook: SourceFile): JsonObject | undefined {
	return asJsonObject(hook.data["supported_platforms"])["codex"] as
		| JsonObject
		| undefined;
}

function codexHookCommand(hook: SourceFile): string {
	return `node "$(git rev-parse --show-toplevel)/.codex/hooks/${hook.data["id"]}.mjs"`;
}

function renderCodexHookRuntime(
	root: string,
	hook: SourceFile,
): RenderedPayload {
	const handler = asJsonObject(hook.data["handler"]);
	const runtimePath = String(handler["runtime_path"]);
	return {
		content: readTextFile(root, runtimePath).toString("utf8"),
		path: `codex/.codex/hooks/${hook.data["id"]}.mjs`,
		sourcePaths: [hook.path, runtimePath],
	};
}

function validateCodexHookRuntime(root: string, hook: SourceFile) {
	if (!codexHookMapping(hook)) {
		return [];
	}
	const handler = asJsonObject(hook.data["handler"]);
	const runtimePath = String(handler["runtime_path"]);
	const runtimeExists = existsSync(resolve(root, runtimePath));
	return [
		{
			message: `${hook.data["id"]}: codex runtime ${runtimePath} ${runtimeExists ? "found" : "missing"}`,
			ok: runtimeExists,
			path: hook.path,
		},
	];
}

function codexConfigObject(graph: SourceGraph): JsonObject {
	return codexProjectConfigObject(graph, configFor(graph));
}

function codexConfigSchemaUrl(graph: SourceGraph): string {
	const schemas = asJsonObject(graph.upstreamSchemas.data["schemas"]);
	const codexConfig = asJsonObject(schemas["codex_config"]);
	return String(codexConfig["url"]);
}

function validateCodexConfig(
	root: string,
	config: JsonObject,
	generatedPath: string,
	sourcePath: string,
	schemaUrl: string,
): void {
	const schema = readJsonFile(
		root,
		"source/schemas/cache/codex-config-schema.json",
	);
	const validate = new Ajv({
		allErrors: true,
		logger: false,
		strict: false,
	}).compile(schema);
	if (!validate(config)) {
		throw new OalError(`${generatedPath} failed codex_config`, [
			...(validate.errors ?? []).map((error) => ({
				badValue: valueAtJsonPath(config, error.instancePath),
				file: generatedPath,
				generatedFile: generatedPath,
				jsonPath: error.instancePath || "/",
				message: error.message ?? "codex config schema rule failed",
				platform: "codex",
				requiredValue: error.params,
				schemaUrl,
				sourceFile: sourcePath,
			})),
		]);
	}
}

function valueAtJsonPath(value: unknown, jsonPath: string): unknown {
	if (!jsonPath) {
		return value;
	}
	let current = value;
	for (const rawPart of jsonPath.split("/").slice(1)) {
		if (!current || typeof current !== "object") {
			return undefined;
		}
		const part = rawPart.replaceAll("~1", "/").replaceAll("~0", "~");
		current = (current as JsonObject)[part];
	}
	return current;
}

function renderAgentsMd(graph: SourceGraph): string {
	const lines = [
		"# OpenAgentLayer Codex instructions",
		"",
		"Generated from OAL source. Do not edit generated output by hand.",
		"",
		"## Agents",
		"",
		...graph.agents.flatMap((agent) => [
			`### ${agent.data["display_name"]}`,
			"",
			`- id: \`${agent.data["id"]}\``,
			`- route: \`${agent.data["model_route"]}\``,
			`- role: ${agent.data["role"]}`,
			"",
		]),
	];
	return `${lines.join("\n")}\n`;
}

function toToml(value: JsonObject): string {
	const lines: string[] = [];
	writeTomlObject(lines, value, []);
	return `${lines.join("\n")}\n`;
}

function writeTomlObject(
	lines: string[],
	value: JsonObject,
	path: string[],
): void {
	const keys = Object.keys(value).sort();
	for (const key of keys) {
		const item = value[key];
		if (
			!item ||
			typeof item !== "object" ||
			(Array.isArray(item) && !isTomlTableArray(item))
		) {
			lines.push(`${key} = ${formatTomlValue(item)}`);
		}
	}
	for (const key of keys) {
		const item = value[key];
		if (Array.isArray(item) && isTomlTableArray(item)) {
			for (const entry of item) {
				if (lines.length > 0) {
					lines.push("");
				}
				lines.push(`[[${[...path, key].join(".")}]]`);
				writeTomlObject(lines, entry as JsonObject, [...path, key]);
			}
		}
	}
	for (const key of keys) {
		const item = value[key];
		if (item && typeof item === "object" && !Array.isArray(item)) {
			if (hasScalarValue(item as JsonObject)) {
				if (lines.length > 0) {
					lines.push("");
				}
				lines.push(`[${[...path, key].join(".")}]`);
			}
			writeTomlObject(lines, item as JsonObject, [...path, key]);
		}
	}
}

function hasScalarValue(value: JsonObject): boolean {
	return Object.values(value).some(
		(item) =>
			!item ||
			typeof item !== "object" ||
			(Array.isArray(item) && !isTomlTableArray(item)),
	);
}

function isTomlTableArray(value: unknown[]): boolean {
	return (
		value.length > 0 &&
		value.every(
			(item) => item && typeof item === "object" && !Array.isArray(item),
		)
	);
}

function formatTomlValue(value: unknown): string {
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(formatTomlValue).join(", ")}]`;
	}
	return JSON.stringify(String(value));
}

function formatTomlMultilineString(value: string): string {
	return `"""\n${value.replaceAll('"""', '\\"\\"\\"').trim()}\n"""`;
}

export function codexConfigJsonForTest(graph: SourceGraph): string {
	return stableStringify(codexConfigObject(graph));
}
