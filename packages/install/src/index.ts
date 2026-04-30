/* biome-ignore lint/performance/noBarrelFile: package public API entrypoint */
export {
	applyInstallPlan,
	applyPreparedInstallPlan,
	createInstallPlan,
	prepareInstallPlan,
} from "./install";
export { getManifestPath } from "./paths";
export type {
	InstallRequest,
	InstallResult,
	InstallScope,
	InstallVerificationIssue,
	InstallVerificationRequest,
	InstallVerificationResult,
	ManagedManifest,
	ManagedManifestEntry,
	PlannedInstallWrite,
	PreparedInstallPlan,
	UninstallRequest,
	UninstallResult,
} from "./types";
export { uninstallManagedFiles } from "./uninstall";
export { verifyManagedInstall } from "./verify";
