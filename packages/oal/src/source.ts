import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

export const greekGodAgents = [
	"atalanta",
	"athena",
	"calliope",
	"hephaestus",
	"hermes",
	"nemesis",
	"odysseus",
] as const;

export const codexModels = [
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini",
	"gpt-5.3-codex",
	"gpt-5.3-codex-spark",
	"gpt-5.2",
] as const;

export type JsonObject = Record<string, unknown>;
const rawSchemaBase =
	"https://raw.githubusercontent.com/xsyetopz/OpenAgentLayer/refs/heads/master/source/schema/";

export interface SourceFile<T = JsonObject> {
	path: string;
	data: T;
}

export interface SourceGraph {
	root: SourceFile;
	agents: SourceFile[];
	agentPrompts: SourceFile<string>[];
	promptModules: SourceFile<string>[];
	hookEvents: SourceFile;
	hooks: SourceFile[];
	modelRoutes: SourceFile;
	platformConfigs: SourceFile[];
	platforms: SourceFile[];
	providers: SourceFile;
	subscriptions: SourceFile;
	skillBodies: SourceFile<string>[];
	skills: SourceFile[];
	tools: SourceFile;
	upstreamSchemas: SourceFile;
	workflows: SourceFile[];
}

export interface OalErrorDetail {
	file: string;
	jsonPath: string;
	message: string;
	badValue?: unknown;
	generatedFile?: string;
	platform?: string;
	requiredValue?: unknown;
	schemaUrl?: string;
	sourceFile?: string;
}

export class OalError extends Error {
	readonly details: OalErrorDetail[];

	constructor(message: string, details: OalErrorDetail[] = []) {
		super(message);
		this.name = "OalError";
		this.details = details;
	}
}

export function createOalError(
	file: string,
	jsonPath: string,
	message: string,
	badValue?: unknown,
	requiredValue?: unknown,
): OalError {
	return new OalError(message, [
		{ badValue, file, jsonPath, message, requiredValue },
	]);
}

export function formatOalError(error: unknown): string {
	if (!(error instanceof OalError)) {
		return error instanceof Error ? error.message : String(error);
	}
	const detailText = error.details
		.map((detail) => {
			const values = [
				`file=${detail.file}`,
				detail.platform === undefined
					? undefined
					: `platform=${detail.platform}`,
				detail.generatedFile === undefined
					? undefined
					: `generatedFile=${detail.generatedFile}`,
				detail.sourceFile === undefined
					? undefined
					: `sourceFile=${detail.sourceFile}`,
				detail.schemaUrl === undefined
					? undefined
					: `schemaUrl=${detail.schemaUrl}`,
				`jsonPath=${detail.jsonPath}`,
				`message=${detail.message}`,
				detail.badValue === undefined
					? undefined
					: `badValue=${JSON.stringify(detail.badValue)}`,
				detail.requiredValue === undefined
					? undefined
					: `requiredValue=${JSON.stringify(detail.requiredValue)}`,
			]
				.filter(Boolean)
				.join(" ");
			return `- ${values}`;
		})
		.join("\n");
	return `${error.message}\n${detailText}`;
}

export function toRepoPath(root: string, path: string): string {
	return relative(root, path).split(sep).join("/");
}

export function readJsonFile<T = JsonObject>(root: string, path: string): T {
	return JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
}

export function readTextFile(root: string, path: string): Buffer {
	return readFileSync(resolve(root, path));
}

export function sha256(content: string | Buffer): string {
	return createHash("sha256").update(content).digest("hex");
}

export function stableStringify(value: unknown): string {
	return `${JSON.stringify(sortJson(value), null, "\t")}\n`;
}

export function writeStableJson(path: string, value: unknown): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, stableStringify(value));
}

export function withRawSchemaUrl(value: unknown): unknown {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return value;
	}
	const record = { ...(value as JsonObject) };
	const schema = record["$schema"];
	if (typeof schema !== "string") {
		return record;
	}
	const schemaFile = schema.split("/").at(-1);
	if (!schemaFile?.endsWith(".schema.json")) {
		return record;
	}
	record["$schema"] = `${rawSchemaBase}${schemaFile}`;
	return record;
}

export function sortJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortJson);
	}
	if (!value || typeof value !== "object") {
		return value;
	}
	const sorted: JsonObject = {};
	for (const key of Object.keys(value as JsonObject).sort()) {
		sorted[key] = sortJson((value as JsonObject)[key]);
	}
	return sorted;
}

export function listJsonFiles(root: string, path: string): string[] {
	const absolute = resolve(root, path);
	if (!existsSync(absolute)) {
		return [];
	}
	return readdirSync(absolute)
		.filter((entry) => entry.endsWith(".json"))
		.sort()
		.map((entry) => `${path}/${entry}`);
}

export function listNestedJsonFiles(root: string, path: string): string[] {
	const absolute = resolve(root, path);
	if (!existsSync(absolute)) {
		return [];
	}
	const files: string[] = [];
	for (const entry of readdirSync(absolute).sort()) {
		const child = join(absolute, entry);
		if (statSync(child).isDirectory()) {
			files.push(...listNestedJsonFiles(root, `${path}/${entry}`));
		} else if (entry.endsWith(".json")) {
			files.push(toRepoPath(root, child));
		}
	}
	return files;
}

export function listMarkdownFiles(root: string, path: string): string[] {
	const absolute = resolve(root, path);
	if (!existsSync(absolute)) {
		return [];
	}
	return readdirSync(absolute)
		.filter((entry) => entry.endsWith(".md"))
		.sort()
		.map((entry) => `${path}/${entry}`);
}

export function loadSource(root = process.cwd()): SourceGraph {
	const sourceFile = <T = JsonObject>(path: string): SourceFile<T> => ({
		data: readJsonFile<T>(root, path),
		path,
	});
	const textFile = (path: string): SourceFile<string> => ({
		data: readTextFile(root, path).toString("utf8"),
		path,
	});
	const rootSource = sourceFile("source/oal.json");
	const enabledPlatforms = rootSource.data["platforms"] as string[];
	const agents = listJsonFiles(root, "source/agents").map((path) =>
		sourceFile(path),
	);
	const skills = listJsonFiles(root, "source/skills").map((path) =>
		sourceFile(path),
	);
	return {
		agentPrompts: agents.map((agent) =>
			textFile(String(agent.data["prompt_path"])),
		),
		agents,
		hookEvents: sourceFile("source/hooks/events.json"),
		hooks: listJsonFiles(root, "source/hooks")
			.filter((path) => path !== "source/hooks/events.json")
			.map((path) => sourceFile(path)),
		modelRoutes: sourceFile("source/routes/models.json"),
		platformConfigs: enabledPlatforms.map((platform) =>
			sourceFile(`source/platforms/${platform}/config.json`),
		),
		platforms: enabledPlatforms.map((platform) =>
			sourceFile(`source/platforms/${platform}/platform.json`),
		),
		providers: sourceFile("source/providers/providers.json"),
		promptModules: listMarkdownFiles(root, "source/prompts/shared").map(
			(path) => textFile(path),
		),
		root: rootSource,
		skillBodies: skills.map((skill) =>
			textFile(String(skill.data["body_path"])),
		),
		skills,
		subscriptions: sourceFile("source/routes/subscriptions.json"),
		tools: sourceFile("source/tools/tools.json"),
		upstreamSchemas: sourceFile("source/schemas/upstream.json"),
		workflows: listJsonFiles(root, "source/workflows").map((path) =>
			sourceFile(path),
		),
	};
}

export function sourceFiles(graph: SourceGraph): SourceFile<unknown>[] {
	return [
		graph.root,
		...graph.agents,
		...graph.agentPrompts,
		...graph.promptModules,
		graph.hookEvents,
		...graph.hooks,
		graph.modelRoutes,
		...graph.platformConfigs,
		...graph.platforms,
		graph.providers,
		...graph.skills,
		...graph.skillBodies,
		graph.subscriptions,
		graph.tools,
		graph.upstreamSchemas,
		...graph.workflows,
	];
}

export function validateJsonBySchema(
	root: string,
	schemaPath: string,
	dataPath: string,
): void {
	const ajv = new Ajv2020({ allErrors: true });
	ajv.addFormat("uri", {
		type: "string",
		validate(value: string) {
			try {
				new URL(value);
				return true;
			} catch {
				return false;
			}
		},
	});
	const schema = readJsonFile(root, schemaPath);
	const data = readJsonFile(root, dataPath);
	const validate = ajv.compile(schema);
	if (!validate(data)) {
		throw new OalError(`${dataPath} failed ${schemaPath}`, [
			...(validate.errors ?? []).map((error) => ({
				badValue: error.data,
				file: dataPath,
				jsonPath: error.instancePath || "/",
				message: error.message ?? "local schema rule failed",
				requiredValue: error.params,
			})),
		]);
	}
}

export function cleanDirectory(path: string): void {
	rmSync(path, { force: true, recursive: true });
	mkdirSync(path, { recursive: true });
}

export function createTempDirectory(prefix: string): string {
	return mkdtempSync(join(tmpdir(), prefix));
}
