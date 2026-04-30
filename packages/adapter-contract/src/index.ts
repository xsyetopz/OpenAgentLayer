import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type {
	Diagnostic,
	SourceGraph,
	SourceRecord,
	Surface,
} from "@openagentlayer/types";

export type AdapterId = Surface;

export type AdapterArtifactKind =
	| "agent"
	| "skill"
	| "command"
	| "instruction"
	| "hook"
	| "config"
	| "plugin"
	| "installer-metadata"
	| "validation-metadata";

export type AdapterCapability = SourceRecord["kind"] | AdapterArtifactKind;

export type InstallScope = "global" | "project";

export type AdapterArtifactInstallMode =
	| "full-file"
	| "marked-text-block"
	| "structured-object";

export interface AdapterContext {
	readonly surface: Surface;
	readonly deterministicId: string;
	readonly records: readonly string[];
	readonly modelPlanId?: string;
}

export interface AdapterArtifact {
	readonly surface: Surface;
	readonly kind: AdapterArtifactKind;
	readonly path: string;
	readonly content: string;
	readonly sourceRecordIds: readonly string[];
	readonly installMode?: AdapterArtifactInstallMode;
	readonly managedBlockId?: string;
	readonly managedKeyPaths?: readonly string[];
}

export interface AdapterRenderResult {
	readonly artifacts: readonly AdapterArtifact[];
	readonly diagnostics: readonly Diagnostic[];
}

export interface AdapterBundle {
	readonly adapterId: AdapterId;
	readonly surface: Surface;
	readonly artifacts: readonly AdapterArtifact[];
	readonly diagnostics: readonly Diagnostic[];
}

export interface InstallPlanEntry {
	readonly path: string;
	readonly content: string;
	readonly action: "write" | "remove";
}

export interface InstallPlan {
	readonly surface: Surface;
	readonly scope: InstallScope;
	readonly entries: readonly InstallPlanEntry[];
}

export interface InstallOptions {
	readonly scope: InstallScope;
	readonly root: string;
}

export interface UnsupportedCapabilityDiagnostic extends Diagnostic {
	readonly level: "warning";
	readonly code: "unsupported-capability";
}

export interface SurfaceAdapter {
	readonly id: AdapterId;
	readonly surface: Surface;
	readonly capabilities: readonly AdapterCapability[];
	readonly supports: (record: SourceRecord) => boolean;
	readonly render: (
		record: SourceRecord,
		context: AdapterContext,
	) => AdapterRenderResult;
	readonly renderBundle: (
		graph: SourceGraph,
		context: AdapterContext,
	) => AdapterBundle;
	readonly validateBundle: (bundle: AdapterBundle) => readonly Diagnostic[];
	readonly installPlan: (
		bundle: AdapterBundle,
		options: InstallOptions,
	) => InstallPlan;
}

export function createUnsupportedCapabilityDiagnostic(
	surface: Surface,
	record: SourceRecord,
): UnsupportedCapabilityDiagnostic {
	return {
		level: "warning",
		code: "unsupported-capability",
		message: `Surface '${surface}' does not support source record '${record.kind}:${record.id}'.`,
		path: record.location.metadataPath,
	};
}

export function validateAdapterBundle(
	bundle: AdapterBundle,
): readonly Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const paths = new Set<string>();

	for (const artifact of bundle.artifacts) {
		if (artifact.surface !== bundle.surface) {
			diagnostics.push(
				errorDiagnostic(
					"adapter-surface-mismatch",
					`Artifact '${artifact.path}' targets '${artifact.surface}' inside '${bundle.surface}' bundle.`,
					artifact.path,
				),
			);
		}

		if (paths.has(artifact.path)) {
			diagnostics.push(
				errorDiagnostic(
					"duplicate-artifact-path",
					`Adapter bundle contains duplicate artifact path '${artifact.path}'.`,
					artifact.path,
				),
			);
		}
		paths.add(artifact.path);
	}

	return diagnostics;
}
