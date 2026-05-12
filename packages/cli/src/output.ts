import type { DeployChange, DeployPlan } from "@openagentlayer/deploy";
import type { Provider } from "@openagentlayer/source";

export interface OutputOptions {
	dryRun?: boolean;
	quiet?: boolean;
	verbose?: boolean;
}

export function printHeader(title: string, mode?: string): void {
	console.log(mode ? `${title} · ${mode}` : title);
}

export function printStep(message: string): void {
	console.log(`◇ ${message}`);
}

export function printSuccess(message: string): void {
	console.log(`└ ✓ ${message}`);
}

export function printWarning(message: string): void {
	console.log(`  ! ${message}`);
}

export function printDetail(label: string, value: string | number): void {
	console.log(`  ${label}: ${value}`);
}

export function printCommand(command: string): void {
	console.log(`  $ ${command}`);
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
	const mode = options.dryRun ? "dry-run" : "apply";
	printHeader("OpenAgentLayer deploy", mode);
	printDetail("source", report.sourceRoot);
	printDetail("providers", report.providers.join(", "));
	const skippedProviders = report.skippedProviders ?? [];
	if (skippedProviders.length > 0)
		for (const skipped of skippedProviders)
			printWarning(`skip ${skipped.provider}: ${skipped.reason}`);
	printDetail("scope", report.scope);
	printDetail("target", report.targetRoot);
	printDetail("manifest", report.manifestRoot);
	printDetail("artifacts", report.plan.artifacts.length);
	printDetail(
		"changes",
		`write ${counts.write}, update ${counts.update}, skip ${counts.skip}, remove ${counts.remove}, backup ${counts.backup}`,
	);
	if (
		report.plan.artifacts.some(
			(artifact) =>
				artifact.provider === "codex" &&
				artifact.path === ".codex/requirements.toml",
		)
	)
		printWarning(
			"Codex requirements.toml rendered; install it into Codex managed requirements for approval-free hooks",
		);
	if (report.binary) {
		printDetail(
			"binary",
			`${report.binary.action} ${report.binary.path} (${report.binary.reason})`,
		);
		if (!report.binary.pathReady)
			printWarning(
				`add ${dirname(report.binary.path)} to PATH or run ${report.binary.path} directly`,
			);
	}
	if (options.verbose) {
		for (const change of report.plan.changes)
			printDetail(change.action, `${change.path} # ${change.reason}`);
	}
}

export function printChanges(
	label: string,
	changes: DeployChange[],
	options: OutputOptions = {},
): void {
	if (options.quiet) return;
	const counts = countActions(changes);
	printStep(label);
	printDetail(
		"changes",
		`write ${counts.write}, update ${counts.update}, skip ${counts.skip}, remove ${counts.remove}, backup ${counts.backup}`,
	);
	if (options.verbose)
		for (const change of changes)
			printDetail(change.action, `${change.path} # ${change.reason}`);
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
