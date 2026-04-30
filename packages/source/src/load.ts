import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { errorDiagnostic, hasErrors } from "@openagentlayer/diagnostics";
import {
	asObject,
	readString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type {
	AgentRecord,
	CommandRecord,
	Diagnostic,
	GuidanceRecord,
	LoadResult,
	ModelPlanRecord,
	PolicyRecord,
	SkillRecord,
	SourceGraph,
	SourceRecord,
	Surface,
	SurfaceConfigRecord,
} from "@openagentlayer/types";
import { buildAgentRecord } from "./records/agent";
import { buildCommandRecord } from "./records/command";
import { buildGuidanceRecord } from "./records/guidance";
import { buildModelPlanRecord } from "./records/model-plan";
import { buildPolicyRecord } from "./records/policy";
import type { SourceRecordBase } from "./records/shared";
import { readTextIfPresent } from "./records/shared";
import { buildSkillRecord } from "./records/skill";
import { buildSurfaceConfigRecord } from "./records/surface-config";
import {
	validateGraphReferences,
	validateRecordFields,
	validateRecordIdentity,
} from "./validate";
import { validateDocumentation } from "./validate-docs";

interface RecordDefinition {
	readonly kind: SourceRecord["kind"];
	readonly directory: string;
	readonly metadataName: string;
}

const RECORD_DEFINITIONS: readonly RecordDefinition[] = [
	{ kind: "agent", directory: "agents", metadataName: "agent.toml" },
	{ kind: "skill", directory: "skills", metadataName: "skill.toml" },
	{ kind: "command", directory: "commands", metadataName: "command.toml" },
	{ kind: "policy", directory: "policies", metadataName: "policy.toml" },
	{ kind: "guidance", directory: "guidance", metadataName: "guidance.toml" },
	{
		kind: "model-plan",
		directory: "model-plans",
		metadataName: "model-plan.toml",
	},
	{
		kind: "surface-config",
		directory: "surface-configs",
		metadataName: "surface-config.toml",
	},
];

export async function loadSourceGraph(root: string): Promise<LoadResult> {
	const sourceRoot = resolve(root, "source");
	const diagnostics: Diagnostic[] = [];
	const records: SourceRecord[] = [];

	for (const definition of RECORD_DEFINITIONS) {
		const directory = join(sourceRoot, definition.directory);
		const entries = await readDirectoryIfPresent(directory);
		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const recordDirectory = join(directory, entry.name);
			const metadataPath = join(recordDirectory, definition.metadataName);
			const record = await loadRecord(
				definition.kind,
				recordDirectory,
				metadataPath,
				diagnostics,
			);
			if (record !== undefined) {
				records.push(record);
			}
		}
	}

	diagnostics.push(...(await validateDocumentation(root)));

	const duplicateDiagnostics = validateDuplicateIds(records);
	diagnostics.push(...duplicateDiagnostics);

	if (hasErrors(diagnostics)) {
		return { diagnostics };
	}

	const graph = buildGraph(records);
	const referenceDiagnostics = validateGraphReferences(graph);
	diagnostics.push(...referenceDiagnostics);

	if (hasErrors(diagnostics)) {
		return { diagnostics };
	}

	return { graph, diagnostics };
}

function buildGraph(records: readonly SourceRecord[]): SourceGraph {
	const sortedRecords = [...records].sort(compareRecords);
	const byId = new Map(
		sortedRecords.map((record) => [record.id, record] as const),
	);
	return {
		records: sortedRecords,
		byId,
		agents: sortedRecords.filter(
			(record): record is AgentRecord => record.kind === "agent",
		),
		skills: sortedRecords.filter(
			(record): record is SkillRecord => record.kind === "skill",
		),
		commands: sortedRecords.filter(
			(record): record is CommandRecord => record.kind === "command",
		),
		policies: sortedRecords.filter(
			(record): record is PolicyRecord => record.kind === "policy",
		),
		guidance: sortedRecords.filter(
			(record): record is GuidanceRecord => record.kind === "guidance",
		),
		modelPlans: sortedRecords.filter(
			(record): record is ModelPlanRecord => record.kind === "model-plan",
		),
		surfaceConfigs: sortedRecords.filter(
			(record): record is SurfaceConfigRecord =>
				record.kind === "surface-config",
		),
	};
}

async function loadRecord(
	expectedKind: SourceRecord["kind"],
	recordDirectory: string,
	metadataPath: string,
	diagnostics: Diagnostic[],
): Promise<SourceRecord | undefined> {
	const relativeMetadataPath = relative(process.cwd(), metadataPath);
	const text = await readTextIfPresent(metadataPath);
	if (text === undefined) {
		diagnostics.push(
			errorDiagnostic(
				"missing-metadata",
				`Missing ${expectedKind} metadata file.`,
				relativeMetadataPath,
			),
		);
		return undefined;
	}

	const parsed = parseToml(text, relativeMetadataPath, diagnostics);
	const source = asObject(parsed, relativeMetadataPath, diagnostics);
	if (source === undefined) {
		return undefined;
	}

	const id = readString(source, "id", relativeMetadataPath, diagnostics);
	const kind = readString(source, "kind", relativeMetadataPath, diagnostics);
	const title = readString(source, "title", relativeMetadataPath, diagnostics);
	const description = readString(
		source,
		"description",
		relativeMetadataPath,
		diagnostics,
	);
	const surfaces = readStringArray(
		source,
		"surfaces",
		relativeMetadataPath,
		diagnostics,
		{ required: true },
	);

	if (
		id === undefined ||
		kind === undefined ||
		title === undefined ||
		description === undefined
	) {
		return undefined;
	}

	validateRecordIdentity(id, kind, surfaces, relativeMetadataPath, diagnostics);
	if (kind !== expectedKind) {
		diagnostics.push(
			errorDiagnostic(
				"kind-mismatch",
				`Expected kind '${expectedKind}', got '${kind}'.`,
				relativeMetadataPath,
			),
		);
		return undefined;
	}

	const base = {
		id,
		kind,
		title,
		description,
		surfaces: surfaces as readonly Surface[],
		location: {
			directory: relative(process.cwd(), recordDirectory),
			metadataPath: relativeMetadataPath,
			bodyPath: undefined,
		},
		raw: source,
	} as const;

	const record = await buildTypedRecord(base, recordDirectory, diagnostics);
	if (record !== undefined) {
		validateRecordFields(record, diagnostics);
	}

	return record;
}

async function buildTypedRecord(
	base: SourceRecordBase,
	recordDirectory: string,
	diagnostics: Diagnostic[],
): Promise<SourceRecord | undefined> {
	switch (base.kind) {
		case "agent":
			return await buildAgentRecord(base, recordDirectory, diagnostics);
		case "skill":
			return await buildSkillRecord(base, recordDirectory, diagnostics);
		case "command":
			return await buildCommandRecord(base, recordDirectory, diagnostics);
		case "policy":
			return buildPolicyRecord(base, diagnostics);
		case "guidance":
			return await buildGuidanceRecord(base, recordDirectory, diagnostics);
		case "model-plan":
			return buildModelPlanRecord(base, diagnostics);
		case "surface-config":
			return buildSurfaceConfigRecord(base, diagnostics);
		default:
			return undefined;
	}
}

function parseToml(
	text: string,
	path: string,
	diagnostics: Diagnostic[],
): unknown {
	try {
		return Bun.TOML.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		diagnostics.push(errorDiagnostic("invalid-toml", message, path));
		return {};
	}
}

async function readDirectoryIfPresent(
	path: string,
): Promise<readonly Dirent[]> {
	try {
		return await readdir(path, { withFileTypes: true });
	} catch (error) {
		if (isNotFoundError(error)) {
			return [];
		}
		throw error;
	}
}

function validateDuplicateIds(
	records: readonly SourceRecord[],
): readonly Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const seen = new Map<string, SourceRecord>();
	for (const record of records) {
		const previous = seen.get(record.id);
		if (previous !== undefined) {
			diagnostics.push(
				errorDiagnostic(
					"duplicate-id",
					`Duplicate record id '${record.id}' in ${previous.location.metadataPath} and ${record.location.metadataPath}.`,
					record.location.metadataPath,
				),
			);
		}
		seen.set(record.id, record);
	}
	return diagnostics;
}

function compareRecords(left: SourceRecord, right: SourceRecord): number {
	return left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id);
}

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
