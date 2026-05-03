import type { DeployChange, DeployPlan } from "@openagentlayer/deploy";
import type { Provider } from "@openagentlayer/source";

export interface OutputOptions {
	dryRun?: boolean;
	quiet?: boolean;
	verbose?: boolean;
}

export interface DeployReport {
	sourceRoot: string;
	providers: readonly (Provider | "all")[];
	skippedProviders?: readonly {
		provider: Provider;
		binary: string;
		reason: string;
	}[];
	scope: string;
	targetRoot: string;
	manifestRoot: string;
	plan: DeployPlan;
	binary?: {
		path: string;
		action: string;
		reason: string;
		pathReady: boolean;
	};
}

export function printDeployReport(
	report: DeployReport,
	options: OutputOptions,
): void {
	if (options.quiet) return;
	const counts = countActions(report.plan.changes);
	const mode = options.dryRun ? "DRY RUN" : "APPLY";
	console.log(`OpenAgentLayer deploy ${mode}`);
	console.log(`source: ${report.sourceRoot}`);
	console.log(`providers: ${report.providers.join(", ")}`);
	const skippedProviders = report.skippedProviders ?? [];
	if (skippedProviders.length > 0)
		for (const skipped of skippedProviders)
			console.log(`skip provider: ${skipped.provider} (${skipped.reason})`);
	console.log(`scope: ${report.scope}`);
	console.log(`target: ${report.targetRoot}`);
	console.log(`manifest: ${report.manifestRoot}`);
	console.log(`artifacts: ${report.plan.artifacts.length}`);
	console.log(
		`changes: write ${counts.write}, update ${counts.update}, skip ${counts.skip}, remove ${counts.remove}, backup ${counts.backup}`,
	);
	if (report.binary) {
		console.log(
			`binary: ${report.binary.action} ${report.binary.path} (${report.binary.reason})`,
		);
		if (!report.binary.pathReady)
			console.log(
				`path: add ${dirname(report.binary.path)} to PATH or run ${report.binary.path} directly`,
			);
	}
	if (options.verbose || options.dryRun) {
		for (const change of report.plan.changes)
			console.log(`${change.action}: ${change.path} # ${change.reason}`);
	}
}

export function printChanges(
	label: string,
	changes: DeployChange[],
	options: OutputOptions = {},
): void {
	if (options.quiet) return;
	const counts = countActions(changes);
	console.log(label);
	console.log(
		`changes: write ${counts.write}, update ${counts.update}, skip ${counts.skip}, remove ${counts.remove}, backup ${counts.backup}`,
	);
	if (options.verbose)
		for (const change of changes)
			console.log(`${change.action}: ${change.path} # ${change.reason}`);
}

function countActions(
	changes: DeployChange[],
): Record<DeployChange["action"], number> {
	return changes.reduce(
		(counts, change) => {
			counts[change.action] += 1;
			return counts;
		},
		{ backup: 0, remove: 0, skip: 0, update: 0, write: 0 },
	);
}

function dirname(path: string): string {
	const index = path.lastIndexOf("/");
	return index < 0 ? "." : path.slice(0, index);
}
