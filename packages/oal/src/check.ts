import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { adapterFor } from "./adapters";
import { assertRenderIdempotent } from "./render";
import {
	codexModels,
	createOalError,
	greekGodAgents,
	type JsonObject,
	loadSource,
	readJsonFile,
	readTextFile,
	type SourceFile,
	type SourceGraph,
	sha256,
	sourceFiles,
	validateJsonBySchema,
} from "./source";

const schemaChecks = [
	["source/schema/oal.schema.json", "source/oal.json"],
	[
		"source/schema/upstream-schemas.schema.json",
		"source/schemas/upstream.json",
	],
	[
		"source/schema/subscriptions.schema.json",
		"source/routes/subscriptions.json",
	],
	["source/schema/model-routes.schema.json", "source/routes/models.json"],
	["source/schema/providers.schema.json", "source/providers/providers.json"],
	["source/schema/tools.schema.json", "source/tools/tools.json"],
] as const;

const markdownToolCellPattern = /^\|\s*`([^`]+)`/;

export function checkSource(root = process.cwd()): void {
	for (const [schema, data] of schemaChecks) {
		validateJsonBySchema(root, schema, data);
	}
	const graph = loadSource(root);
	const platformConfigs = existingPlatformConfigs(root);
	const enabledPlatforms = graph.root.data["platforms"] as string[];
	for (const agent of readdirSync(resolve(root, "source/agents")).sort()) {
		validateJsonBySchema(
			root,
			"source/schema/agent.schema.json",
			`source/agents/${agent}`,
		);
	}
	for (const hook of readdirSync(resolve(root, "source/hooks")).sort()) {
		validateJsonBySchema(
			root,
			"source/schema/hook.schema.json",
			`source/hooks/${hook}`,
		);
	}
	for (const platform of existingPlatformIds(root)) {
		validateJsonBySchema(
			root,
			"source/schema/platform.schema.json",
			`source/platforms/${platform}/platform.json`,
		);
		validateJsonBySchema(
			root,
			"source/schema/platform-config.schema.json",
			`source/platforms/${platform}/config.json`,
		);
	}
	for (const platform of enabledPlatforms) {
		if (!adapterFor(platform)) {
			throw createOalError(
				graph.root.path,
				"/platforms",
				"enabled platform has no registered adapter",
				platform,
				"registered adapter",
			);
		}
	}
	checkNoGeneratedSource(graph);
	checkRootReferences(graph);
	checkAgents(graph);
	checkHooks(graph);
	checkUpstreamHashes(root, graph);
	checkModelRoutes(graph);
	checkSubscriptions(graph);
	checkProfileDefaults(graph, platformConfigs);
	checkPlatformPolicies(graph);
	checkProviders(graph);
	checkTools(root, graph);
	assertRenderIdempotent(root);
}

function existingPlatformIds(root: string): string[] {
	const platformRoot = resolve(root, "source/platforms");
	return readdirSync(platformRoot)
		.filter((entry) => statSync(resolve(platformRoot, entry)).isDirectory())
		.sort();
}

function existingPlatformConfigs(root: string): SourceFile[] {
	return existingPlatformIds(root)
		.map((platform) => `source/platforms/${platform}/config.json`)
		.filter((path) => existsSync(resolve(root, path)))
		.map((path) => ({ data: readJsonFile(root, path), path }));
}

function checkNoGeneratedSource(graph: SourceGraph): void {
	for (const file of sourceFiles(graph)) {
		if (file.path.startsWith("generated/")) {
			throw createOalError(
				file.path,
				"/",
				"generated output cannot be source input",
				file.path,
				"source/**",
			);
		}
	}
}

function checkRootReferences(graph: SourceGraph): void {
	const root = graph.root.data;
	checkListExists(
		root,
		"platforms",
		graph.platforms.map((file) => String(file.data["id"])),
		graph.root.path,
	);
	checkListExists(
		root,
		"providers",
		Object.keys(providerRecords(graph)),
		graph.root.path,
	);
	checkListExists(root, "routes", ["subscriptions", "models"], graph.root.path);
	checkListExists(
		root,
		"tools",
		Object.keys(toolRecords(graph)),
		graph.root.path,
	);
}

function checkListExists(
	root: JsonObject,
	key: string,
	available: string[],
	file: string,
): void {
	for (const value of root[key] as string[]) {
		if (!available.includes(value)) {
			throw createOalError(
				file,
				`/${key}`,
				`${key} references missing source record`,
				value,
				available,
			);
		}
	}
}

function checkAgents(graph: SourceGraph): void {
	const ids = graph.agents.map((agent) => String(agent.data["id"])).sort();
	const required = [...greekGodAgents].sort();
	if (JSON.stringify(ids) !== JSON.stringify(required)) {
		throw createOalError(
			"source/agents",
			"/",
			"Greek-gods agent set mismatch",
			ids,
			required,
		);
	}
}

function checkHooks(graph: SourceGraph): void {
	for (const hook of graph.hooks) {
		const id = String(hook.data["id"]);
		const category = String(hook.data["category"]);
		if (!id.startsWith(`${category}-`)) {
			throw createOalError(
				hook.path,
				"/id",
				"hook id must start with hook category prefix",
				id,
				`${category}-*`,
			);
		}
	}
}

function checkUpstreamHashes(root: string, graph: SourceGraph): void {
	for (const [id, schema] of Object.entries(upstreamSchemas(graph))) {
		const schemaRecord = schema as JsonObject;
		const actual = sha256(
			readTextFile(root, String(schemaRecord["local_cache"])),
		);
		if (actual !== schemaRecord["sha256"]) {
			throw createOalError(
				graph.upstreamSchemas.path,
				`/schemas/${id}/sha256`,
				"upstream schema hash mismatch",
				actual,
				schemaRecord["sha256"],
			);
		}
	}
}

function checkModelRoutes(graph: SourceGraph): void {
	const models = graph.modelRoutes.data;
	checkRoutesInAllowedSet(
		graph.modelRoutes.path,
		"/codex",
		models["codex"] as JsonObject,
		[...codexModels],
	);
	checkRoutesInAllowedSet(
		graph.modelRoutes.path,
		"/claude",
		models["claude"] as JsonObject,
		[
			"claude-opus-4-7",
			"claude-opus-4-6",
			"claude-sonnet-4-6",
			"claude-haiku-4-5",
		],
	);
	checkRoutesInAllowedSet(
		graph.modelRoutes.path,
		"/opencode",
		models["opencode"] as JsonObject,
		[
			"opencode/big-pickle",
			"opencode/minimax-m2.5-free",
			"opencode/hy3-preview-free",
			"opencode/ling-2.6-flash-free",
			"opencode/nemotron-3-super-free",
		],
	);
}

function checkProfileDefaults(
	graph: SourceGraph,
	platformConfigs: SourceFile[],
): void {
	const models = graph.modelRoutes.data;
	const subscriptions = graph.subscriptions.data;
	const effortByPlatform: Record<string, string[]> = {
		claude: ["low", "medium", "high", "xhigh", "max"],
		codex: ["none", "low", "medium", "high", "xhigh"],
	};
	for (const config of platformConfigs) {
		const platform = String(config.data["platform"]);
		const profiles = config.data["profile_defaults"];
		if (!profiles) {
			continue;
		}
		const allowedModels = (models[platform] as JsonObject | undefined)?.[
			"allowed_models"
		] as string[] | undefined;
		const allowedSubscriptions = (
			subscriptions[platform] as JsonObject | undefined
		)?.["allowed"] as string[] | undefined;
		const allowedEfforts = effortByPlatform[platform];
		if (!(allowedModels && allowedSubscriptions && allowedEfforts)) {
			continue;
		}
		for (const [profile, rawProfile] of Object.entries(
			profiles as JsonObject,
		)) {
			if (!allowedSubscriptions.includes(profile)) {
				throw createOalError(
					config.path,
					`/profile_defaults/${profile}`,
					"profile default key must match allowed subscription",
					profile,
					allowedSubscriptions,
				);
			}
			const agents = (rawProfile as JsonObject)["agents"] as
				| JsonObject
				| undefined;
			if (!agents) {
				throw createOalError(
					config.path,
					`/profile_defaults/${profile}/agents`,
					"profile default must define Greek-gods agents",
					rawProfile,
					greekGodAgents,
				);
			}
			for (const agent of greekGodAgents) {
				const assignment = agents[agent] as JsonObject | undefined;
				if (!assignment) {
					throw createOalError(
						config.path,
						`/profile_defaults/${profile}/agents`,
						"profile default missing Greek-gods agent",
						agents,
						agent,
					);
				}
				const model = String(assignment["model"]);
				if (!allowedModels.includes(model)) {
					throw createOalError(
						config.path,
						`/profile_defaults/${profile}/agents/${agent}/model`,
						"profile default uses unavailable model id",
						model,
						allowedModels,
					);
				}
				const effort = String(assignment["effort"]);
				if (!allowedEfforts.includes(effort)) {
					throw createOalError(
						config.path,
						`/profile_defaults/${profile}/agents/${agent}/effort`,
						"profile default uses unsupported effort",
						effort,
						allowedEfforts,
					);
				}
			}
			for (const agent of Object.keys(agents)) {
				if (
					!greekGodAgents.includes(agent as (typeof greekGodAgents)[number])
				) {
					throw createOalError(
						config.path,
						`/profile_defaults/${profile}/agents`,
						"profile default contains non-Greek-gods agent",
						agent,
						greekGodAgents,
					);
				}
			}
		}
	}
}

function checkRoutesInAllowedSet(
	file: string,
	jsonPath: string,
	record: JsonObject,
	requiredAllowed: string[],
): void {
	const allowed = record["allowed_models"] as string[];
	for (const required of requiredAllowed) {
		if (!allowed.includes(required)) {
			throw createOalError(
				file,
				`${jsonPath}/allowed_models`,
				"required model id missing",
				allowed,
				required,
			);
		}
	}
	for (const model of allowed) {
		if (!requiredAllowed.includes(model)) {
			throw createOalError(
				file,
				`${jsonPath}/allowed_models`,
				"allowed model set contains unsupported model id",
				model,
				requiredAllowed,
			);
		}
	}
	for (const [route, model] of Object.entries(record["routes"] as JsonObject)) {
		if (!allowed.includes(String(model))) {
			throw createOalError(
				file,
				`${jsonPath}/routes/${route}`,
				"route uses unsupported model id",
				model,
				allowed,
			);
		}
	}
}

function checkSubscriptions(graph: SourceGraph): void {
	const subscriptions = graph.subscriptions.data;
	checkAllowedSubscription(
		graph.subscriptions.path,
		"/codex",
		subscriptions["codex"] as JsonObject,
		["plus", "pro-5", "pro-20"],
	);
	checkAllowedSubscription(
		graph.subscriptions.path,
		"/claude",
		subscriptions["claude"] as JsonObject,
		["max-5", "max-20"],
	);
	const claude = subscriptions["claude"] as JsonObject;
	if (!(claude["blocked"] as string[]).includes("plus")) {
		throw createOalError(
			graph.subscriptions.path,
			"/claude/blocked",
			"Claude Code plus consumer profile must be blocked",
			claude["blocked"],
			"plus",
		);
	}
}

function checkAllowedSubscription(
	file: string,
	jsonPath: string,
	record: JsonObject,
	requiredAllowed: string[],
): void {
	const allowed = record["allowed"] as string[];
	if (!allowed.includes(String(record["default"]))) {
		throw createOalError(
			file,
			`${jsonPath}/default`,
			"subscription default outside allowed set",
			record["default"],
			allowed,
		);
	}
	for (const required of requiredAllowed) {
		if (!allowed.includes(required)) {
			throw createOalError(
				file,
				`${jsonPath}/allowed`,
				"required subscription missing",
				allowed,
				required,
			);
		}
	}
	for (const tier of allowed) {
		if (!requiredAllowed.includes(tier)) {
			throw createOalError(
				file,
				`${jsonPath}/allowed`,
				"subscription allowed set contains unsupported tier",
				tier,
				requiredAllowed,
			);
		}
	}
}

function checkPlatformPolicies(graph: SourceGraph): void {
	const enabled = graph.root.data["platforms"] as string[];
	if (enabled.includes("codex")) {
		const codex = configFor(graph, "codex");
		const codexFeatures = (codex.data["required_config"] as JsonObject)[
			"features"
		] as JsonObject;
		checkRequired(
			codex.path,
			"/subscription/default",
			(codex.data["subscription"] as JsonObject)["default"],
			"plus",
		);
		checkRequired(
			codex.path,
			"/required_config/features/fast_mode",
			codexFeatures["fast_mode"],
			false,
		);
		checkRequired(
			codex.path,
			"/required_config/features/experimental_use_unified_exec_tool",
			codexFeatures["experimental_use_unified_exec_tool"],
			false,
		);
		checkRequired(
			codex.path,
			"/required_config/experimental_use_unified_exec_tool",
			(codex.data["required_config"] as JsonObject)[
				"experimental_use_unified_exec_tool"
			],
			false,
		);
		checkRequired(
			codex.path,
			"/required_config/features/multi_agent",
			codexFeatures["multi_agent"],
			false,
		);
		checkRequired(
			codex.path,
			"/required_config/features/multi_agent_v2",
			codexFeatures["multi_agent_v2"],
			true,
		);
	}
	if (enabled.includes("claude")) {
		const claude = configFor(graph, "claude");
		checkRequired(
			claude.path,
			"/subscription/default",
			(claude.data["subscription"] as JsonObject)["default"],
			"max-5",
		);
		checkRequired(
			claude.path,
			"/required_config/disableAllHooks",
			(claude.data["required_config"] as JsonObject)["disableAllHooks"],
			false,
		);
		checkRequired(
			claude.path,
			"/required_config/fastMode",
			(claude.data["required_config"] as JsonObject)["fastMode"],
			false,
		);
		checkRequired(
			claude.path,
			"/required_config/fastModePerSessionOptIn",
			(claude.data["required_config"] as JsonObject)["fastModePerSessionOptIn"],
			false,
		);
	}
	if (enabled.includes("opencode")) {
		const opencode = configFor(graph, "opencode");
		if (
			!greekGodAgents.includes(
				(opencode.data["required_config"] as JsonObject)[
					"default_agent"
				] as (typeof greekGodAgents)[number],
			)
		) {
			throw createOalError(
				opencode.path,
				"/required_config/default_agent",
				"OpenCode default_agent must be Greek-gods agent",
				(opencode.data["required_config"] as JsonObject)["default_agent"],
				greekGodAgents,
			);
		}
	}
}

function checkRequired(
	file: string,
	jsonPath: string,
	actual: unknown,
	required: unknown,
): void {
	if (actual !== required) {
		throw createOalError(
			file,
			jsonPath,
			"required policy value mismatch",
			actual,
			required,
		);
	}
}

function checkProviders(graph: SourceGraph): void {
	for (const [id, provider] of Object.entries(providerRecords(graph))) {
		const record = provider as JsonObject;
		for (const field of ["repo_url", "branch", "locked_ref"]) {
			if (!(record["git"] as JsonObject)[field]) {
				throw createOalError(
					graph.providers.path,
					`/providers/${id}/git/${field}`,
					"git-backed provider missing required provenance field",
					(record["git"] as JsonObject)[field],
					"non-empty string",
				);
			}
		}
		if (!String(record["upstream_path"]).endsWith("/upstream")) {
			throw createOalError(
				graph.providers.path,
				`/providers/${id}/upstream_path`,
				"provider upstream path must end with /upstream",
				record["upstream_path"],
				"providers/<id>/upstream",
			);
		}
		if (!String(record["overlay_path"]).endsWith("/overlay")) {
			throw createOalError(
				graph.providers.path,
				`/providers/${id}/overlay_path`,
				"provider overlay path must end with /overlay",
				record["overlay_path"],
				"providers/<id>/overlay",
			);
		}
		if (
			String(record["sync_mode"]) !== "optional-cli" &&
			(record["git"] as JsonObject)["sync_strategy"] !== "clone-fetch-checkout"
		) {
			throw createOalError(
				graph.providers.path,
				`/providers/${id}/git/sync_strategy`,
				"required git provider must use clone-fetch-checkout sync",
				(record["git"] as JsonObject)["sync_strategy"],
				"clone-fetch-checkout",
			);
		}
		const provenance = record["provenance"] as JsonObject;
		for (const field of ["record_commit", "record_branch", "record_paths"]) {
			if (provenance[field] !== true) {
				throw createOalError(
					graph.providers.path,
					`/providers/${id}/provenance/${field}`,
					"provider provenance flag must be true",
					provenance[field],
					true,
				);
			}
		}
	}
}

function checkTools(root: string, graph: SourceGraph): void {
	for (const [id, tool] of Object.entries(toolRecords(graph))) {
		const install = (tool as JsonObject)["install"] as JsonObject;
		if (!install["linux"]) {
			throw createOalError(
				graph.tools.path,
				`/tools/${id}/install/linux`,
				"Linux tool install record must name package-manager detection",
				install["linux"],
				"package-manager or upstream-script",
			);
		}
	}
	checkRequiredTools(graph);
	checkToolDocs(root, graph);
}

function checkRequiredTools(graph: SourceGraph): void {
	for (const tool of ["bun", "rtk", "rg", "fd", "ast-grep", "jq"]) {
		const record = toolRecords(graph)[tool] as JsonObject | undefined;
		if (!record || record["required"] !== true) {
			throw createOalError(
				graph.tools.path,
				`/tools/${tool}/required`,
				"required baseline tool must be source-backed",
				record?.["required"],
				true,
			);
		}
	}
}

function checkToolDocs(root: string, graph: SourceGraph): void {
	const knownTools = new Set<string>();
	for (const [id, tool] of Object.entries(toolRecords(graph))) {
		knownTools.add(id);
		for (const alias of ((tool as JsonObject)["aliases"] as
			| string[]
			| undefined) ?? []) {
			knownTools.add(alias);
		}
	}
	for (const docCheck of [
		{
			end: "## Anti-bloat rules",
			jsonPath: "/Tool matrix",
			path: "docs/research/useful-cli-tools.md",
			start: "## Tool matrix",
		},
		{
			end: "## Host install policy",
			jsonPath: "/Required tools",
			path: "docs/research/provider-tool-study.md",
			start: "## Required tools",
		},
	]) {
		const doc = readTextFile(root, docCheck.path).toString("utf8");
		for (const tool of documentedToolNamesInSection(
			doc,
			docCheck.start,
			docCheck.end,
		)) {
			if (!knownTools.has(tool)) {
				throw createOalError(
					docCheck.path,
					docCheck.jsonPath,
					"documented CLI tool must have source record or alias",
					tool,
					graph.tools.path,
				);
			}
		}
	}
}

function documentedToolNamesInSection(
	doc: string,
	startHeading: string,
	endHeading: string,
): string[] {
	const names: string[] = [];
	let inMatrix = false;
	for (const line of doc.split("\n")) {
		if (line === startHeading) {
			inMatrix = true;
			continue;
		}
		if (inMatrix && line === endHeading) {
			break;
		}
		if (!inMatrix) {
			continue;
		}
		const match = markdownToolCellPattern.exec(line);
		if (match) {
			names.push(match[1]);
		}
	}
	return names;
}

function providerRecords(graph: SourceGraph): JsonObject {
	return graph.providers.data["providers"] as JsonObject;
}

function toolRecords(graph: SourceGraph): JsonObject {
	return graph.tools.data["tools"] as JsonObject;
}

function upstreamSchemas(graph: SourceGraph): JsonObject {
	return graph.upstreamSchemas.data["schemas"] as JsonObject;
}

function configFor(graph: SourceGraph, platform: string): SourceFile {
	const config = graph.platformConfigs.find(
		(file) => file.data["platform"] === platform,
	);
	if (!config) {
		throw createOalError(
			"source/platforms",
			"/",
			"platform config missing",
			platform,
			"source/platforms/<platform>/config.json",
		);
	}
	return config;
}
