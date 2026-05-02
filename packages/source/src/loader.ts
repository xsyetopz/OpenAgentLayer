import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createSourceGraph, type SourceGraph } from "./graph";
import { readJson, readRecords } from "./read";
import type {
	AgentRecord,
	HookRecord,
	OalSource,
	ProductSource,
	RouteRecord,
	SkillRecord,
	ToolRecord,
} from "./records";
import {
	validateAgentRecord,
	validateHookRecord,
	validateProductSource,
	validateRouteRecord,
	validateSkillRecord,
	validateSkillRecordShape,
	validateToolRecord,
} from "./validate";

export async function loadSource(sourceRoot: string): Promise<SourceGraph> {
	const product = await readJson<ProductSource>(
		join(sourceRoot, "product.json"),
	);
	validateProductSource(product);
	const source: OalSource = {
		...product,
		promptTemplates: await loadPromptTemplates(sourceRoot),
		agents: await readRecords<AgentRecord>(
			sourceRoot,
			"agents",
			validateAgentRecord,
		),
		skills: await loadSkillRecords(sourceRoot),
		routes: await readRecords<RouteRecord>(
			sourceRoot,
			"routes",
			validateRouteRecord,
		),
		hooks: await readRecords<HookRecord>(
			sourceRoot,
			"hooks",
			validateHookRecord,
		),
		tools: await readRecords<ToolRecord>(
			sourceRoot,
			"tools",
			validateToolRecord,
		),
	};
	return createSourceGraph(sourceRoot, source);
}

async function loadPromptTemplates(
	sourceRoot: string,
): Promise<NonNullable<ProductSource["promptTemplates"]>> {
	const promptRoot = join(sourceRoot, "prompts");
	return {
		agentContract: await readFile(
			join(promptRoot, "agent-contract.md"),
			"utf8",
		),
		skillContract: await readFile(
			join(promptRoot, "skill-contract.md"),
			"utf8",
		),
		commandContract: await readFile(
			join(promptRoot, "command-contract.md"),
			"utf8",
		),
		instructions: await readFile(join(promptRoot, "instructions.md"), "utf8"),
		codexBaseline: await readFile(
			join(promptRoot, "codex-baseline.md"),
			"utf8",
		),
	};
}

async function loadSkillRecords(sourceRoot: string): Promise<SkillRecord[]> {
	const records = await readRecords<SkillRecord>(
		sourceRoot,
		"skills",
		validateSkillRecordShape,
	);
	const hydrated = await Promise.all(
		records.map(async (record) =>
			hydrateSupportFiles(
				sourceRoot,
				await hydrateUpstreamSkill(sourceRoot, record),
			),
		),
	);
	for (const record of hydrated) validateSkillRecord(record);
	return hydrated;
}

async function hydrateSupportFiles(
	sourceRoot: string,
	record: SkillRecord,
): Promise<SkillRecord> {
	const supportFiles = record.supportFiles ?? [];
	if (supportFiles.length === 0) return record;
	return {
		...record,
		supportFiles: await Promise.all(
			supportFiles.map(async (supportFile) => {
				if (!supportFile.source) return supportFile;
				return {
					...supportFile,
					content: await readFile(join(sourceRoot, supportFile.source), "utf8"),
				};
			}),
		),
	};
}

async function hydrateUpstreamSkill(
	sourceRoot: string,
	record: SkillRecord,
): Promise<SkillRecord> {
	if (!record.upstream) return record;
	const upstreamPath = join(sourceRoot, "..", record.upstream.path);
	return {
		...record,
		body: await readFile(upstreamPath, "utf8"),
	};
}
