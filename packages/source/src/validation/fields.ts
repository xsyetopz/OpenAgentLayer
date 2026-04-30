import { basename } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, SourceRecord } from "@openagentlayer/types";
import {
	AGENT_MODE_SET,
	POLICY_CATEGORY_SET,
	POLICY_FAILURE_MODE_SET,
	POLICY_HANDLER_CLASS_SET,
	ROUTE_KIND_SET,
} from "./identity";
import { isKnownEffort, isKnownModelId, validateModelPlan } from "./models";
import { validateSurfaceConfig } from "./surface-config";

export function validateRecordFields(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	validateRouteContract(record, diagnostics);
	validateModelPolicy(record, diagnostics);
	validateModelPlan(record, diagnostics);
	validateSurfaceConfig(record, diagnostics);

	if (record.kind === "agent" && !AGENT_MODE_SET.has(record.mode)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-agent-mode",
				`Unknown agent mode '${record.mode}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.kind === "agent" && record.handoff_contract === undefined) {
		diagnostics.push(
			errorDiagnostic(
				"missing-handoff-contract",
				`Agent '${record.id}' must define a handoff contract.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.kind === "agent" &&
		record.effort_ceiling !== undefined &&
		!isKnownEffort(record.effort_ceiling)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-effort",
				`Unknown effort ceiling '${record.effort_ceiling}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.kind === "policy") {
		validatePolicyRecordFields(record, diagnostics);
	}

	if (record.kind === "skill") {
		validateSkillRecordFields(record, diagnostics);
	}

	if (record.kind === "command") {
		validateCommandRecordFields(record, diagnostics);
	}
}

const AGENT_SKILL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_AGENT_SKILL_ID_LENGTH = 64;
const MAX_AGENT_SKILL_DESCRIPTION_LENGTH = 1_024;
const MAX_AGENT_SKILL_COMPATIBILITY_LENGTH = 500;
const FORBIDDEN_SKILL_ID_PATTERN = /(^|-)full-skill($|-)/u;
const PLACEHOLDER_BODY_PATTERN =
	/(^|\n)\s*(TODO|FIXME|\.\.\.|…)\s*($|\n)|rest follows|similar to above|add more as needed/iu;
const STANDALONE_PLACEHOLDER_LINE_PATTERN = /^\s*(TODO|FIXME|\.\.\.|…)\s*$/u;
const PLACEHOLDER_PHRASES = [
	"rest follows",
	"similar to above",
	"add more as needed",
] as const;
const FRONTMATTER_PATTERN = /^---\n[\s\S]*?\n---\n?/u;
const NUMBERED_LIST_PATTERN = /^\d+\.\s/u;
const COMMAND_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const ARGUMENT_PLACEHOLDER_PATTERN = /\$ARGUMENTS|\$\d+/u;

function validateSkillRecordFields(
	record: Extract<SourceRecord, { readonly kind: "skill" }>,
	diagnostics: Diagnostic[],
): void {
	if (
		record.id.length > MAX_AGENT_SKILL_ID_LENGTH ||
		!AGENT_SKILL_ID_PATTERN.test(record.id)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-agent-skill-name",
				`Skill id '${record.id}' must be a lowercase kebab-case Agent Skills name.`,
				record.location.metadataPath,
			),
		);
	}

	if (basename(record.location.directory) !== record.id) {
		diagnostics.push(
			errorDiagnostic(
				"skill-directory-mismatch",
				`Skill directory name must match skill id '${record.id}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (FORBIDDEN_SKILL_ID_PATTERN.test(record.id)) {
		diagnostics.push(
			errorDiagnostic(
				"unnecessary-skill-wrapper",
				`Skill '${record.id}' is an unnecessary wrapper; source the concrete Agent Skill directly.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.description.length > MAX_AGENT_SKILL_DESCRIPTION_LENGTH) {
		diagnostics.push(
			errorDiagnostic(
				"agent-skill-description-too-long",
				`Skill '${record.id}' description exceeds ${MAX_AGENT_SKILL_DESCRIPTION_LENGTH} characters.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.compatibility !== undefined &&
		record.compatibility.length > MAX_AGENT_SKILL_COMPATIBILITY_LENGTH
	) {
		diagnostics.push(
			errorDiagnostic(
				"agent-skill-compatibility-too-long",
				`Skill '${record.id}' compatibility exceeds ${MAX_AGENT_SKILL_COMPATIBILITY_LENGTH} characters.`,
				record.location.metadataPath,
			),
		);
	}

	validateImportedSkillAttribution(record, diagnostics);
	validateSkillBody(record, diagnostics);
}

function validateImportedSkillAttribution(
	record: Extract<SourceRecord, { readonly kind: "skill" }>,
	diagnostics: Diagnostic[],
): void {
	if (
		record.metadata["origin"] !== "openagentlayer-local" &&
		record.metadata["origin"] !== "openagentlayer-vendor" &&
		record.metadata["origin"] !== "openagentlayer-upstream" &&
		record.upstream === undefined
	) {
		return;
	}

	if (
		typeof record.metadata["source_package"] !== "string" ||
		record.metadata["source_package"].length === 0 ||
		typeof record.metadata["upstream_name"] !== "string" ||
		record.metadata["upstream_name"].length === 0 ||
		record.upstream?.commit === undefined ||
		record.upstream.repository === undefined
	) {
		diagnostics.push(
			errorDiagnostic(
				"missing-imported-skill-attribution",
				`Imported skill '${record.id}' must preserve source package, upstream name, repository, and commit attribution.`,
				record.location.metadataPath,
			),
		);
	}
}

function validateSkillBody(
	record: Extract<SourceRecord, { readonly kind: "skill" }>,
	diagnostics: Diagnostic[],
): void {
	const bodyWithoutFrontmatter = record.body_content
		.replace(FRONTMATTER_PATTERN, "")
		.trim();
	const bodyLines = bodyWithoutFrontmatter
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));
	const hasProceduralStructure = bodyLines.some(
		(line) =>
			line.startsWith("- ") ||
			line.startsWith("* ") ||
			NUMBERED_LIST_PATTERN.test(line) ||
			line.startsWith("## "),
	);

	if (bodyLines.length < 2 || !hasProceduralStructure) {
		diagnostics.push(
			errorDiagnostic(
				"barebones-skill-body",
				`Skill '${record.id}' must include procedural guidance beyond a heading or one-line summary.`,
				record.location.bodyPath ?? record.location.metadataPath,
			),
		);
	}

	if (containsActivePlaceholder(record.body_content)) {
		diagnostics.push(
			errorDiagnostic(
				"placeholder-skill-body",
				`Skill '${record.id}' body contains placeholder text.`,
				record.location.bodyPath ?? record.location.metadataPath,
			),
		);
	}
}

function validateCommandRecordFields(
	record: Extract<SourceRecord, { readonly kind: "command" }>,
	diagnostics: Diagnostic[],
): void {
	if (!COMMAND_ID_PATTERN.test(record.id)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-command-id",
				`Command id '${record.id}' must be lowercase kebab-case.`,
				record.location.metadataPath,
			),
		);
	}

	if (basename(record.location.directory) !== record.id) {
		diagnostics.push(
			errorDiagnostic(
				"command-directory-mismatch",
				`Command directory name must match command id '${record.id}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.arguments.length > 0 && !hasArgumentPlaceholder(record)) {
		diagnostics.push(
			errorDiagnostic(
				"unused-command-arguments",
				`Command '${record.id}' declares arguments but does not use $ARGUMENTS or positional placeholders.`,
				record.location.bodyPath ?? record.location.metadataPath,
			),
		);
	}

	if (
		record.side_effect_level !== undefined &&
		record.side_effect_level !== "none" &&
		record.hook_policies.length === 0
	) {
		diagnostics.push(
			errorDiagnostic(
				"side-effect-command-missing-hook",
				`Command '${record.id}' has side effects but no hook policies.`,
				record.location.metadataPath,
			),
		);
	}

	validateCommandBody(record, diagnostics);
}

function hasArgumentPlaceholder(
	record: Extract<SourceRecord, { readonly kind: "command" }>,
): boolean {
	return (
		ARGUMENT_PLACEHOLDER_PATTERN.test(record.prompt_template_content) ||
		record.arguments.some((argument) =>
			record.prompt_template_content.includes(`$${argument}`),
		)
	);
}

function validateCommandBody(
	record: Extract<SourceRecord, { readonly kind: "command" }>,
	diagnostics: Diagnostic[],
): void {
	const bodyWithoutFrontmatter = record.prompt_template_content
		.replace(FRONTMATTER_PATTERN, "")
		.trim();
	const bodyLines = bodyWithoutFrontmatter
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));
	const hasProceduralStructure = bodyLines.some(
		(line) =>
			line.startsWith("- ") ||
			line.startsWith("* ") ||
			NUMBERED_LIST_PATTERN.test(line) ||
			line.startsWith("## "),
	);

	if (bodyLines.length < 2 || !hasProceduralStructure) {
		diagnostics.push(
			errorDiagnostic(
				"barebones-command-body",
				`Command '${record.id}' must include procedural route guidance beyond a heading or one-line summary.`,
				record.location.bodyPath ?? record.location.metadataPath,
			),
		);
	}

	if (containsActivePlaceholder(record.prompt_template_content)) {
		diagnostics.push(
			errorDiagnostic(
				"placeholder-command-body",
				`Command '${record.id}' body contains placeholder text.`,
				record.location.bodyPath ?? record.location.metadataPath,
			),
		);
	}
}

function containsActivePlaceholder(body: string): boolean {
	if (PLACEHOLDER_BODY_PATTERN.test(body)) {
		for (const line of body.split("\n")) {
			const normalizedLine = line.trim();
			const lowercaseLine = normalizedLine.toLowerCase();
			if (STANDALONE_PLACEHOLDER_LINE_PATTERN.test(normalizedLine)) {
				return true;
			}
			if (
				PLACEHOLDER_PHRASES.some((phrase) => lowercaseLine.includes(phrase)) &&
				!normalizedLine.includes('"') &&
				!normalizedLine.includes("`") &&
				!lowercaseLine.includes("banned") &&
				!lowercaseLine.includes("never")
			) {
				return true;
			}
		}
	}

	return false;
}

function validatePolicyRecordFields(
	record: Extract<SourceRecord, { readonly kind: "policy" }>,
	diagnostics: Diagnostic[],
): void {
	if (!POLICY_CATEGORY_SET.has(record.category)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-policy-category",
				`Unknown policy category '${record.category}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.failure_mode !== undefined &&
		!POLICY_FAILURE_MODE_SET.has(record.failure_mode)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-failure-mode",
				`Unknown failure mode '${record.failure_mode}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.handler_class !== undefined &&
		!POLICY_HANDLER_CLASS_SET.has(record.handler_class)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-handler-class",
				`Unknown handler class '${record.handler_class}'.`,
				record.location.metadataPath,
			),
		);
	}
}

function validateRouteContract(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	const routeContract =
		record.kind === "agent" ||
		record.kind === "skill" ||
		record.kind === "command"
			? record.route_contract
			: undefined;
	if (routeContract !== undefined && !ROUTE_KIND_SET.has(routeContract)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-route-contract",
				`Unknown route contract '${routeContract}'.`,
				record.location.metadataPath,
			),
		);
	}
}

function validateModelPolicy(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	const modelPolicy =
		record.kind === "skill" || record.kind === "command"
			? record.model_policy
			: undefined;
	if (modelPolicy !== undefined && !isKnownModelId(modelPolicy)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-model-policy",
				`Unknown model policy '${modelPolicy}'.`,
				record.location.metadataPath,
			),
		);
	}
}
