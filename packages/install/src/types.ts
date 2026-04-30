import type {
	AdapterArtifact,
	AdapterArtifactInstallMode,
	AdapterBundle,
} from "@openagentlayer/adapter-contract";
import type { Surface } from "@openagentlayer/types";

export type InstallScope = "project" | "global";

export interface ManagedManifestEntry {
	readonly path: string;
	readonly sha256: string;
	readonly artifactKind: string;
	readonly sourceRecordIds: readonly string[];
	readonly installMode: AdapterArtifactInstallMode;
	readonly managedBlockId?: string;
	readonly blockContent?: string;
	readonly managedValues?: Record<string, unknown>;
}

export interface ManagedManifest {
	readonly surface: Surface;
	readonly scope: InstallScope;
	readonly targetRoot: string;
	readonly generatedAt: "deterministic";
	readonly entries: readonly ManagedManifestEntry[];
}

export interface InstallRequest {
	readonly bundle: AdapterBundle;
	readonly scope: InstallScope;
	readonly targetRoot: string;
}

export interface InstallResult {
	readonly manifest: ManagedManifest;
	readonly writtenFiles: readonly string[];
}

export interface UninstallRequest {
	readonly surface: Surface;
	readonly scope: InstallScope;
	readonly targetRoot: string;
}

export interface UninstallResult {
	readonly manifestPath: string;
	readonly removedFiles: readonly string[];
	readonly issues: readonly InstallVerificationIssue[];
}

export interface InstallVerificationRequest {
	readonly surface: Surface;
	readonly scope: InstallScope;
	readonly targetRoot: string;
}

export interface InstallVerificationIssue {
	readonly code:
		| "config-conflict"
		| "missing-manifest"
		| "invalid-manifest"
		| "missing-file"
		| "hash-mismatch"
		| "managed-content-changed"
		| "path-escape"
		| "hook-execution-failed";
	readonly path: string;
	readonly message: string;
}

export interface InstallVerificationResult {
	readonly manifestPath: string;
	readonly issues: readonly InstallVerificationIssue[];
}

export interface ManifestReadResult {
	readonly manifest?: ManagedManifest;
	readonly issues: readonly InstallVerificationIssue[];
}

export interface PlannedInstallWrite {
	readonly artifact: AdapterArtifact;
	readonly content: string;
	readonly entry: ManagedManifestEntry;
	readonly targetPath: string;
}

export interface PreparedInstallPlan {
	readonly manifest: ManagedManifest;
	readonly writes: readonly PlannedInstallWrite[];
}
