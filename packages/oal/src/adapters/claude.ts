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
	type PlatformAdapter,
	type RenderedPayload,
	statusMap,
} from "./types";

export const claudeAdapter: PlatformAdapter = {
	capabilities(graph: SourceGraph): CapabilityReport {
		const platform = platformFor(graph);
		const surfaces = statusMap(platform.data["native_surfaces"] as string[]);
		surfaces["commands"] = "manual";
		surfaces["mcp"] = "manual";
		surfaces["model_routes"] = "manual";
		surfaces["permissions"] = "manual";
		surfaces["settings"] = "supported";
		surfaces["skills"] = "manual";
		return {
			platform: "claude",
			surfaces,
		};
	},
	detect(root: string, graph: SourceGraph): DetectResult {
		const config = configFor(graph);
		return {
			available: Boolean(Bun.which(String(config.data["binary"]))),
			binary: String(config.data["binary"]),
			config_root: "~/.claude",
			platform: "claude",
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
			...validateClaudeHookRuntime(root, hook),
		]);
		return {
			checks,
			ok: checks.every((check) => check.ok),
			platform: "claude",
		};
	},
	id: "claude",
	render(root: string, graph: SourceGraph): RenderedPayload[] {
		const config = configFor(graph);
		const settings = claudeSettingsObject(graph, config);
		validateClaudeSettings(
			root,
			settings,
			"generated/claude/.claude/settings.json",
			config.path,
			claudeSettingsSchemaUrl(graph),
		);
		return [
			{
				content: renderClaudeMd(graph),
				path: "claude/CLAUDE.md",
				sourcePaths: [
					"source/oal.json",
					...graph.workflows.map((workflow) => workflow.path),
					...graph.promptModules.map((module) => module.path),
				],
			},
			...graph.agents.map((agent) => ({
				content: renderClaudeAgent(graph, agent),
				path: `claude/.claude/agents/${agent.data["id"]}.md`,
				sourcePaths: [
					agent.path,
					String(agent.data["prompt_path"]),
					config.path,
					...graph.promptModules.map((module) => module.path),
				],
			})),
			...graph.hooks
				.filter((hook) => claudeHookMapping(hook))
				.map((hook) => renderClaudeHookRuntime(root, hook)),
			{
				content: `${JSON.stringify(settings, null, "\t")}\n`,
				path: "claude/.claude/settings.json",
				sourcePaths: [config.path, ...graph.hooks.map((hook) => hook.path)],
			},
		];
	},
};

function renderClaudeMd(graph: SourceGraph): string {
	const lines = [
		composeModelInstructions(graph).trim(),
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

function renderClaudeAgent(graph: SourceGraph, agent: SourceFile): string {
	const profile = claudeProfileFor(graph, agent);
	return [
		"---",
		`name: ${agent.data["id"]}`,
		`description: ${String(agent.data["role"])}`,
		`model: ${profile["model"]}`,
		`effort: ${profile["effort"]}`,
		"---",
		"",
		composeAgentPrompt(graph, agent, "Claude Code"),
		"",
	].join("\n");
}

function claudeProfileFor(graph: SourceGraph, agent: SourceFile): JsonObject {
	const config = configFor(graph);
	const defaultTier = String(
		asJsonObject(config.data["subscription"])["default"],
	);
	const defaults = asJsonObject(config.data["profile_defaults"]);
	const profile = asJsonObject(defaults[defaultTier]);
	const agents = asJsonObject(profile["agents"]);
	return asJsonObject(agents[String(agent.data["id"])]);
}

function configFor(graph: SourceGraph): SourceFile {
	const config = graph.platformConfigs.find(
		(file) => file.data["platform"] === "claude",
	);
	if (!config) {
		throw new Error("source/platforms/claude/config.json is required");
	}
	return config;
}

function platformFor(graph: SourceGraph): SourceFile {
	const platform = graph.platforms.find((file) => file.data["id"] === "claude");
	if (!platform) {
		throw new Error("source/platforms/claude/platform.json is required");
	}
	return platform;
}

function claudeSettingsObject(
	graph: SourceGraph,
	config: SourceFile,
): JsonObject {
	return {
		$schema: claudeSettingsSchemaUrl(graph),
		...asJsonObject(config.data["required_config"]),
		hooks: claudeHookConfig(graph),
	};
}

function claudeHookConfig(graph: SourceGraph): JsonObject {
	const events: JsonObject = {};
	for (const hook of graph.hooks) {
		const mapping = claudeHookMapping(hook);
		if (!mapping) {
			continue;
		}
		for (const event of mapping["events"] as string[]) {
			const groups = (events[event] as JsonObject[] | undefined) ?? [];
			const handler: JsonObject = {
				command: claudeHookCommand(hook),
				type: "command",
			};
			if (mapping["timeout_seconds"] !== undefined) {
				handler["timeout"] = mapping["timeout_seconds"];
			}
			const group: JsonObject = {
				hooks: [handler],
			};
			if (mapping["matcher"] !== undefined) {
				group["matcher"] = mapping["matcher"];
			}
			groups.push(group);
			events[event] = groups;
		}
	}
	return events;
}

function claudeHookMapping(hook: SourceFile): JsonObject | undefined {
	return asJsonObject(hook.data["supported_platforms"])["claude"] as
		| JsonObject
		| undefined;
}

function claudeHookCommand(hook: SourceFile): string {
	return `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${hook.data["id"]}.mjs"`;
}

function renderClaudeHookRuntime(
	root: string,
	hook: SourceFile,
): RenderedPayload {
	const handler = asJsonObject(hook.data["handler"]);
	const runtimePath = String(handler["runtime_path"]);
	return {
		content: readTextFile(root, runtimePath).toString("utf8"),
		path: `claude/.claude/hooks/${hook.data["id"]}.mjs`,
		sourcePaths: [hook.path, runtimePath],
	};
}

function validateClaudeHookRuntime(root: string, hook: SourceFile) {
	if (!claudeHookMapping(hook)) {
		return [];
	}
	const handler = asJsonObject(hook.data["handler"]);
	const runtimePath = String(handler["runtime_path"]);
	const runtimeExists = existsSync(resolve(root, runtimePath));
	return [
		{
			message: `${hook.data["id"]}: claude runtime ${runtimePath} ${runtimeExists ? "found" : "missing"}`,
			ok: runtimeExists,
			path: hook.path,
		},
	];
}

function claudeSettingsSchemaUrl(graph: SourceGraph): string {
	const schemas = asJsonObject(graph.upstreamSchemas.data["schemas"]);
	const claudeSettings = asJsonObject(schemas["claude_code_settings"]);
	return String(claudeSettings["url"]);
}

function validateClaudeSettings(
	root: string,
	settings: JsonObject,
	generatedPath: string,
	sourcePath: string,
	schemaUrl: string,
): void {
	const schema = readJsonFile(
		root,
		"source/schemas/cache/claude-code-settings.schema.json",
	);
	const validate = new Ajv({
		allErrors: true,
		logger: false,
		strict: false,
	}).compile(schema);
	if (!validate(settings)) {
		throw new OalError(`${generatedPath} failed claude_code_settings`, [
			...(validate.errors ?? []).map((error) => ({
				badValue: valueAtJsonPath(settings, error.instancePath),
				file: generatedPath,
				generatedFile: generatedPath,
				jsonPath: error.instancePath || "/",
				message: error.message ?? "claude settings schema rule failed",
				platform: "claude",
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

export function claudeSettingsJsonForTest(graph: SourceGraph): string {
	return stableStringify(claudeSettingsObject(graph, configFor(graph)));
}
