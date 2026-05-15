import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { renderProvider } from "@openagentlayer/adapter";
import {
	applyBinInstall,
	applyDeploy,
	pathContains,
	planBinInstall,
	planDeploy,
	planDeployDiffs,
	refineBinPlan,
	renderDeployDiffs,
} from "@openagentlayer/deploy";
import { OAL_CLI_ENTRY_RELATIVE } from "@openagentlayer/source";
import { flag, option, providerOptions } from "../arguments";
import { renderOptions } from "../model-options";
import { printDeployReport } from "../output";
import { expandProviders, installableProviders } from "../provider-binaries";
import { scopeArtifacts, scopeContext } from "../scope";
import { loadCheckedSource } from "../source";

export async function runDeployCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const context = scopeContext(args, { requireTarget: true });
	const providers = providerOptions(option(args, "--provider") ?? "all");
	const expandedProviders = expandProviders(providers);
	const installable =
		context.scope === "global"
			? await installableProviders(providers)
			: { providers: expandedProviders, skipped: [] };
	const options = await renderOptions(args);
	const source = await loadCheckedSource(repoRoot, args);
	const artifacts = (
		await Promise.all(
			installable.providers.map((provider) =>
				renderProvider(provider, source, repoRoot, options),
			),
		)
	).flatMap((set) => set.artifacts);
	const plan = await planDeploy(
		context.targetRoot,
		scopeArtifacts(context, artifacts),
		{
			scope: context.scope,
			manifestRoot: context.manifestRoot,
		},
	);
	const dryRun = flag(args, "--dry-run");
	const diff = flag(args, "--diff");
	const quiet = flag(args, "--quiet");
	const verbose = flag(args, "--verbose");
	const binDir = resolve(
		option(args, "--bin-dir") ?? join(homedir(), ".local/bin"),
	);
	const shouldInstallBin =
		context.scope === "global" && !flag(args, "--skip-bin");
	const binPlan = shouldInstallBin
		? await refineBinPlan(
				planBinInstall(binDir, join(repoRoot, OAL_CLI_ENTRY_RELATIVE)),
			)
		: undefined;
	printDeployReport(
		{
			sourceRoot: repoRoot,
			providers,
			skippedProviders: installable.skipped,
			scope: context.scope,
			targetRoot: context.targetRoot,
			manifestRoot: context.manifestRoot,
			plan,
			...(binPlan
				? {
						binary: {
							path: binPlan.path,
							action: binPlan.action,
							reason: binPlan.reason,
							pathReady: pathContains(binDir),
						},
					}
				: {}),
		},
		{ dryRun, quiet, verbose },
	);
	if (dryRun && diff && !quiet) {
		const renderedDiff = renderDeployDiffs(await planDeployDiffs(plan));
		if (renderedDiff.length > 0) console.log(renderedDiff.trimEnd());
	}
	if (!dryRun) {
		await applyDeploy(plan);
		if (binPlan)
			await applyBinInstall(
				context.manifestRoot,
				binPlan,
				join(repoRoot, OAL_CLI_ENTRY_RELATIVE),
			);
	}
}
