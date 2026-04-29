import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import { validateHookMappings } from "../hook-mappings";
import { composeAgentPrompt, composeModelInstructions } from "../prompts";
import type { JsonObject, SourceFile, SourceGraph } from "../source";
import { readJsonFile, stableStringify } from "../source";
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
	doctorHooks(_root: string, graph: SourceGraph): DoctorResult {
		const checks = graph.hooks.flatMap((hook) =>
			validateHookMappings(hook, graph.hookEvents, ["codex"], "codex"),
		);
		return {
			checks,
			ok: checks.every((check) => check.ok),
			platform: "codex",
		};
	},
	id: "codex",
	render(root: string, graph: SourceGraph): RenderedPayload[] {
		const config = configFor(graph);
		validateCodexConfig(
			root,
			codexProjectConfigObject(config),
			"generated/codex/.codex/config.toml",
		);
		validateCodexConfig(
			root,
			codexUserConfigObject(config),
			"generated/codex/user/config.toml",
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
			...graph.hooks
				.filter((hook) =>
					Boolean(asJsonObject(hook.data["supported_platforms"])["codex"]),
				)
				.map((hook) =>
					jsonPayload(`codex/hooks/${hook.data["id"]}.json`, hook.data, [
						hook.path,
					]),
				),
			{
				content: toToml(codexProjectConfigObject(config)),
				path: "codex/.codex/config.toml",
				sourcePaths: [config.path],
			},
			{
				content: toToml(codexUserConfigObject(config)),
				path: "codex/user/config.toml",
				sourcePaths: [config.path],
			},
		];
	},
};

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

function codexProjectConfigObject(config: SourceFile): JsonObject {
	return asJsonObject(config.data["required_config"]);
}

function codexUserConfigObject(config: SourceFile): JsonObject {
	return asJsonObject(config.data["user_config"]);
}

function codexConfigObject(config: SourceFile): JsonObject {
	return codexProjectConfigObject(config);
}

function validateCodexConfig(
	root: string,
	config: JsonObject,
	generatedPath: string,
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
		throw new Error(
			`${generatedPath} failed codex_config: ${JSON.stringify(validate.errors)}`,
		);
	}
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
		if (!item || typeof item !== "object" || Array.isArray(item)) {
			lines.push(`${key} = ${formatTomlValue(item)}`);
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
		(item) => !item || typeof item !== "object" || Array.isArray(item),
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
	return stableStringify(codexConfigObject(configFor(graph)));
}
