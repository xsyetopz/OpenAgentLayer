import { join, relative, resolve, sep } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import {
	readBoolean,
	readObject,
	readOptionalString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type {
	Diagnostic,
	SkillRecord,
	SkillSupportFile,
	UnknownMap,
} from "@openagentlayer/types";
import type {
	SkillUpstreamSource,
	SkillUpstreamSupportFile,
} from "@openagentlayer/types/records";
import type { SourceRecordBase } from "./shared";
import { readRequiredBodyFile, readTextIfPresent } from "./shared";

export async function buildSkillRecord(
	base: SourceRecordBase,
	recordDirectory: string,
	diagnostics: Diagnostic[],
): Promise<SkillRecord | undefined> {
	const source = base.raw;
	const projectRoot = resolve(recordDirectory, "../../..");
	const upstream = readSkillUpstreamSource(
		source,
		projectRoot,
		base.location.metadataPath,
		diagnostics,
	);
	const body = readOptionalString(source, "body") ?? "SKILL.md";
	const bodyContent =
		upstream === undefined
			? await readRequiredBodyFile(recordDirectory, body, diagnostics)
			: await readRequiredThirdPartyFile(
					projectRoot,
					upstream.body,
					base.location.metadataPath,
					diagnostics,
				);
	if (bodyContent === undefined) {
		return undefined;
	}

	const references = readStringArray(
		source,
		"references",
		base.location.metadataPath,
		diagnostics,
	);
	const scripts = readStringArray(
		source,
		"scripts",
		base.location.metadataPath,
		diagnostics,
	);
	const assets = readStringArray(
		source,
		"assets",
		base.location.metadataPath,
		diagnostics,
	);
	const supportingFiles = readStringArray(
		source,
		"supporting_files",
		base.location.metadataPath,
		diagnostics,
	);
	const supportFiles = await readSkillSupportFiles(
		recordDirectory,
		projectRoot,
		[
			...references.map((path) => ({ category: "reference" as const, path })),
			...scripts.map((path) => ({ category: "script" as const, path })),
			...assets.map((path) => ({ category: "asset" as const, path })),
			...supportingFiles.map((path) => ({
				category: "supporting-file" as const,
				path,
			})),
			...(upstream?.support_files.map((file) => ({
				category: file.category,
				path: file.target,
				sourcePath: file.source,
			})) ?? []),
		],
		base.location.metadataPath,
		diagnostics,
	);

	const bodyPath =
		upstream === undefined
			? relative(process.cwd(), join(recordDirectory, body))
			: upstream.body;
	return {
		...base,
		kind: "skill",
		triggers: readStringArray(
			source,
			"triggers",
			base.location.metadataPath,
			diagnostics,
		),
		body,
		body_content: bodyContent,
		upstream,
		license: readOptionalString(source, "license"),
		compatibility: readOptionalString(source, "compatibility"),
		metadata: readObject(
			source,
			"metadata",
			base.location.metadataPath,
			diagnostics,
		),
		allowed_tools: readStringArray(
			source,
			"allowed_tools",
			base.location.metadataPath,
			diagnostics,
		),
		references,
		scripts,
		assets,
		support_files: supportFiles,
		when_to_use: readOptionalString(source, "when_to_use"),
		invocation_mode: readOptionalString(source, "invocation_mode"),
		user_invocable: readBoolean(source, "user_invocable"),
		tool_grants: readStringArray(
			source,
			"tool_grants",
			base.location.metadataPath,
			diagnostics,
		),
		route_contract: readOptionalString(source, "route_contract"),
		model_policy: readOptionalString(
			source,
			"model_policy",
		) as SkillRecord["model_policy"],
		supporting_files: supportingFiles,
		location: { ...base.location, bodyPath },
	};
}

function readSkillUpstreamSource(
	source: UnknownMap,
	projectRoot: string,
	metadataPath: string,
	diagnostics: Diagnostic[],
): SkillUpstreamSource | undefined {
	const upstream = readObject(source, "upstream", metadataPath, diagnostics);
	if (Object.keys(upstream).length === 0) {
		return undefined;
	}

	const body = readOptionalString(upstream, "body");
	if (body === undefined) {
		diagnostics.push(
			errorDiagnostic(
				"missing-upstream-body",
				"Skill upstream table must define a body path.",
				metadataPath,
			),
		);
		return undefined;
	}

	validateThirdPartySourcePath(
		projectRoot,
		body,
		"body",
		metadataPath,
		diagnostics,
	);
	return {
		body,
		commit: readOptionalString(upstream, "commit"),
		package: readOptionalString(upstream, "package"),
		repository: readOptionalString(upstream, "repository"),
		support_files: readUpstreamSupportFiles(
			upstream,
			metadataPath,
			diagnostics,
		),
	};
}

function readUpstreamSupportFiles(
	upstream: UnknownMap,
	metadataPath: string,
	diagnostics: Diagnostic[],
): readonly SkillUpstreamSupportFile[] {
	const rawSupportFiles = upstream["support_files"];
	if (rawSupportFiles === undefined) {
		return [];
	}

	if (!Array.isArray(rawSupportFiles)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-upstream-support-files",
				"Skill upstream support_files must be an array of objects.",
				metadataPath,
			),
		);
		return [];
	}

	const supportFiles: SkillUpstreamSupportFile[] = [];
	for (const rawSupportFile of rawSupportFiles) {
		if (
			typeof rawSupportFile !== "object" ||
			rawSupportFile === null ||
			Array.isArray(rawSupportFile)
		) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-upstream-support-file",
					"Skill upstream support file entries must be objects.",
					metadataPath,
				),
			);
			continue;
		}
		const supportFile = rawSupportFile as UnknownMap;
		const source = readOptionalString(supportFile, "source");
		const target = readOptionalString(supportFile, "target");
		if (source === undefined || target === undefined) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-upstream-support-file",
					"Skill upstream support file entries must define source and target.",
					metadataPath,
				),
			);
			continue;
		}
		supportFiles.push({
			category:
				readSkillSupportFileCategory(supportFile, "category") ??
				"supporting-file",
			source,
			target,
		});
	}

	return supportFiles;
}

function readSkillSupportFileCategory(
	source: UnknownMap,
	key: string,
): SkillSupportFile["category"] | undefined {
	const value = source[key];
	return value === "reference" ||
		value === "script" ||
		value === "asset" ||
		value === "supporting-file"
		? value
		: undefined;
}

async function readRequiredThirdPartyFile(
	projectRoot: string,
	path: string,
	metadataPath: string,
	diagnostics: Diagnostic[],
): Promise<string | undefined> {
	if (
		!validateThirdPartySourcePath(
			projectRoot,
			path,
			"body",
			metadataPath,
			diagnostics,
		)
	) {
		return undefined;
	}

	const resolvedPath = resolve(projectRoot, path);
	const text = await readTextIfPresent(resolvedPath);
	if (text !== undefined) {
		return text;
	}

	diagnostics.push(
		errorDiagnostic(
			"missing-upstream-body",
			`Missing upstream body file '${path}'.`,
			metadataPath,
		),
	);
	return undefined;
}

async function readSkillSupportFiles(
	recordDirectory: string,
	projectRoot: string,
	paths: readonly {
		readonly category: SkillSupportFile["category"];
		readonly path: string;
		readonly sourcePath?: string;
	}[],
	metadataPath: string,
	diagnostics: Diagnostic[],
): Promise<readonly SkillSupportFile[]> {
	const root = resolve(recordDirectory);
	const seen = new Set<string>();
	const supportFiles: SkillSupportFile[] = [];
	for (const { category, path, sourcePath } of paths) {
		if (seen.has(path)) {
			continue;
		}
		seen.add(path);
		const resolvedTargetPath = resolve(recordDirectory, path);
		if (
			resolvedTargetPath !== root &&
			!resolvedTargetPath.startsWith(`${root}${sep}`)
		) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-skill-support-file",
					`Skill support file '${path}' escapes the skill directory.`,
					metadataPath,
				),
			);
			continue;
		}

		const resolvedSourcePath =
			sourcePath === undefined
				? resolvedTargetPath
				: resolve(projectRoot, sourcePath);
		if (
			sourcePath !== undefined &&
			!validateThirdPartySourcePath(
				projectRoot,
				sourcePath,
				"support file",
				metadataPath,
				diagnostics,
			)
		) {
			continue;
		}

		if (!(await Bun.file(resolvedSourcePath).exists())) {
			diagnostics.push(
				errorDiagnostic(
					"missing-skill-support-file",
					`Skill support file '${sourcePath ?? path}' does not exist.`,
					metadataPath,
				),
			);
			continue;
		}

		supportFiles.push({
			category,
			content: await Bun.file(resolvedSourcePath).text(),
			path,
		});
	}
	return supportFiles.sort((left, right) =>
		left.path.localeCompare(right.path),
	);
}

function validateThirdPartySourcePath(
	projectRoot: string,
	path: string,
	label: string,
	metadataPath: string,
	diagnostics: Diagnostic[],
): boolean {
	const thirdPartyRoot = resolve(projectRoot, "third_party");
	const resolvedPath = resolve(projectRoot, path);
	if (
		resolvedPath === thirdPartyRoot ||
		resolvedPath.startsWith(`${thirdPartyRoot}${sep}`)
	) {
		return true;
	}

	diagnostics.push(
		errorDiagnostic(
			"invalid-upstream-source-path",
			`Skill upstream ${label} path '${path}' must stay inside third_party/.`,
			metadataPath,
		),
	);
	return false;
}
