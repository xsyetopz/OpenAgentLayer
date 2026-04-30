import { join, relative, resolve, sep } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import {
	readObject,
	readOptionalString,
	readString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type {
	CommandExample,
	CommandRecord,
	CommandSupportFile,
	Diagnostic,
	UnknownMap,
} from "@openagentlayer/types";
import type { SourceRecordBase } from "./shared";
import { readRequiredBodyFile } from "./shared";

export async function buildCommandRecord(
	base: SourceRecordBase,
	recordDirectory: string,
	diagnostics: Diagnostic[],
): Promise<CommandRecord | undefined> {
	const source = base.raw;
	const ownerRole = readString(
		source,
		"owner_role",
		base.location.metadataPath,
		diagnostics,
	);
	const promptTemplate =
		readOptionalString(source, "prompt_template") ?? "prompt.md";
	const promptTemplateContent = await readRequiredBodyFile(
		recordDirectory,
		promptTemplate,
		diagnostics,
	);
	if (promptTemplateContent === undefined || ownerRole === undefined) {
		return undefined;
	}

	const supportingFiles = readStringArray(
		source,
		"supporting_files",
		base.location.metadataPath,
		diagnostics,
	);
	const supportFiles = await readCommandSupportFiles(
		recordDirectory,
		supportingFiles,
		base.location.metadataPath,
		diagnostics,
	);

	const bodyPath = relative(
		process.cwd(),
		join(recordDirectory, promptTemplate),
	);
	return {
		...base,
		kind: "command",
		owner_role: ownerRole,
		route_contract: readOptionalString(source, "route_contract"),
		aliases: readStringArray(
			source,
			"aliases",
			base.location.metadataPath,
			diagnostics,
		),
		prompt_template: promptTemplate,
		prompt_template_content: promptTemplateContent,
		arguments: readStringArray(
			source,
			"arguments",
			base.location.metadataPath,
			diagnostics,
		),
		argument_schema: readObject(
			source,
			"argument_schema",
			base.location.metadataPath,
			diagnostics,
		),
		invocation: readOptionalString(source, "invocation"),
		side_effect_level: readOptionalString(source, "side_effect_level"),
		surface_overrides: readObject(
			source,
			"surface_overrides",
			base.location.metadataPath,
			diagnostics,
		),
		model_policy: readOptionalString(
			source,
			"model_policy",
		) as CommandRecord["model_policy"],
		hook_policies: readStringArray(
			source,
			"hook_policies",
			base.location.metadataPath,
			diagnostics,
		),
		required_skills: readStringArray(
			source,
			"required_skills",
			base.location.metadataPath,
			diagnostics,
		),
		examples: readCommandExamples(
			source,
			base.location.metadataPath,
			diagnostics,
		),
		support_files: supportFiles,
		supporting_files: supportingFiles,
		location: { ...base.location, bodyPath },
	};
}

async function readCommandSupportFiles(
	recordDirectory: string,
	paths: readonly string[],
	metadataPath: string,
	diagnostics: Diagnostic[],
): Promise<readonly CommandSupportFile[]> {
	const root = resolve(recordDirectory);
	const supportFiles: CommandSupportFile[] = [];
	const seen = new Set<string>();
	for (const path of paths) {
		if (seen.has(path)) {
			continue;
		}
		seen.add(path);
		const resolvedPath = resolve(recordDirectory, path);
		if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${sep}`)) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-command-support-file",
					`Command support file '${path}' escapes the command directory.`,
					metadataPath,
				),
			);
			continue;
		}
		if (!(await Bun.file(resolvedPath).exists())) {
			diagnostics.push(
				errorDiagnostic(
					"missing-command-support-file",
					`Command support file '${path}' does not exist.`,
					metadataPath,
				),
			);
			continue;
		}
		supportFiles.push({ content: await Bun.file(resolvedPath).text(), path });
	}
	return supportFiles.sort((left, right) =>
		left.path.localeCompare(right.path),
	);
}

function readCommandExamples(
	source: UnknownMap,
	path: string,
	diagnostics: Diagnostic[],
): readonly CommandExample[] {
	const value = source["examples"];
	if (value === undefined) {
		return [];
	}
	if (!Array.isArray(value)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-array",
				"Field 'examples' must be an array.",
				path,
			),
		);
		return [];
	}
	const examples: CommandExample[] = [];
	for (const entry of value) {
		if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-object",
					"Command example entries must be objects.",
					path,
				),
			);
			continue;
		}
		const example = entry as UnknownMap;
		if (
			typeof example["title"] !== "string" ||
			typeof example["invocation"] !== "string"
		) {
			diagnostics.push(
				errorDiagnostic(
					"missing-command-example-field",
					"Command examples require title and invocation.",
					path,
				),
			);
			continue;
		}
		examples.push({
			invocation: example["invocation"],
			notes:
				typeof example["notes"] === "string" ? example["notes"] : undefined,
			title: example["title"],
		});
	}
	return examples;
}
