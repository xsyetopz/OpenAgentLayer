import { hasErrors } from "@openagentlayer/diagnostics";
import {
	applyPreparedInstallPlan,
	prepareInstallPlan,
	uninstallManagedFiles,
	verifyManagedInstall,
} from "@openagentlayer/install";
import {
	applyWritePlan,
	createWritePlan,
	serializeWritePlan,
} from "@openagentlayer/render";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import { verifyRenderedHooks } from "./hooks";
import type { CliOptions } from "./options";
import { printDiagnostics, printError } from "./output";
import {
	hasInstallOptions,
	resolveSurfaces,
	resolveTargetRoot,
} from "./surfaces";

export async function checkCommand(options: CliOptions): Promise<number> {
	const result = await loadSourceGraph(options.root);
	printDiagnostics(result.diagnostics);
	if (hasErrors(result.diagnostics) || result.graph === undefined) {
		return 1;
	}

	console.log(`oal check ok: ${result.graph.records.length} source records`);
	return 0;
}

export async function renderCommand(options: CliOptions): Promise<number> {
	if (options.out === undefined) {
		printError("Missing required --out <dir>.");
		return 2;
	}

	const result = await loadSourceGraph(options.root);
	printDiagnostics(result.diagnostics);
	if (hasErrors(result.diagnostics) || result.graph === undefined) {
		return 1;
	}

	const plan = await createWritePlan(result.graph, options.out);
	printDiagnostics(plan.diagnostics);
	if (hasErrors(plan.diagnostics)) {
		return 1;
	}
	process.stdout.write(serializeWritePlan(plan));
	if (!options.dryRun) {
		await applyWritePlan(plan);
	}
	return 0;
}

export async function doctorCommand(options: CliOptions): Promise<number> {
	const loadResult = await loadSourceGraph(options.root);
	printDiagnostics(loadResult.diagnostics);
	if (hasErrors(loadResult.diagnostics) || loadResult.graph === undefined) {
		return 1;
	}

	const graph = loadResult.graph;
	const registry = createAdapterRegistry();
	const bundles = resolveSurfaces(options.surface ?? "all").map((surface) =>
		registry.renderSurfaceBundle(graph, surface),
	);
	const diagnostics = bundles.flatMap((bundle) => bundle.diagnostics);
	printDiagnostics(diagnostics);
	if (hasErrors(diagnostics)) {
		return 1;
	}

	const hookIssues = await verifyRenderedHooks(bundles);
	for (const issue of hookIssues) {
		console.error(`ERROR hook-self-contained: ${issue}`);
	}
	if (hookIssues.length > 0) {
		return 1;
	}

	if (options.scope !== undefined || options.target !== undefined) {
		if (options.surface === undefined) {
			printError("Install verification requires --surface <surface|all>.");
			return 2;
		}
		if (options.scope === undefined) {
			printError("Install verification requires --scope <project|global>.");
			return 2;
		}
		const targetRoot = resolveTargetRoot({
			...options,
			scope: options.scope,
		});
		for (const surface of resolveSurfaces(options.surface)) {
			const result = await verifyManagedInstall({
				scope: options.scope,
				surface,
				targetRoot,
			});
			for (const issue of result.issues) {
				console.error(
					`ERROR install-verify/${issue.code}: ${issue.path}: ${issue.message}`,
				);
			}
			if (result.issues.length > 0) {
				return 1;
			}
			console.log(`oal doctor install ${surface}/${options.scope} ok`);
		}
	}

	console.log(`oal doctor root=${options.root}`);
	console.log(`bun=${Bun.version}`);
	console.log(`oal doctor ok: ${bundles.length} surface bundles verified`);
	return 0;
}

export async function installCommand(options: CliOptions): Promise<number> {
	if (!hasInstallOptions(options)) {
		return 2;
	}

	const loadResult = await loadSourceGraph(options.root);
	printDiagnostics(loadResult.diagnostics);
	if (hasErrors(loadResult.diagnostics) || loadResult.graph === undefined) {
		return 1;
	}

	const graph = loadResult.graph;
	const registry = createAdapterRegistry();
	const targetRoot = resolveTargetRoot(options);
	const bundles = resolveSurfaces(options.surface).map((surface) =>
		registry.renderSurfaceBundle(graph, surface),
	);
	const diagnostics = bundles.flatMap((bundle) => bundle.diagnostics);
	printDiagnostics(diagnostics);
	if (hasErrors(diagnostics)) {
		return 1;
	}

	const preparedPlans = await Promise.all(
		bundles.map((bundle) =>
			prepareInstallPlan({
				bundle,
				scope: options.scope,
				targetRoot,
			}),
		),
	);
	for (const prepared of preparedPlans) {
		const result = await applyPreparedInstallPlan(prepared);
		console.log(
			`oal install ${prepared.manifest.surface}/${options.scope}: ${result.writtenFiles.length} files`,
		);
	}
	return 0;
}

export async function uninstallCommand(options: CliOptions): Promise<number> {
	if (!hasInstallOptions(options)) {
		return 2;
	}

	const targetRoot = resolveTargetRoot(options);
	let hasIssue = false;
	for (const surface of resolveSurfaces(options.surface)) {
		const result = await uninstallManagedFiles({
			scope: options.scope,
			surface,
			targetRoot,
		});
		console.log(
			`oal uninstall ${surface}/${options.scope}: ${result.removedFiles.length} files`,
		);
		for (const issue of result.issues) {
			hasIssue = true;
			printError(`${issue.code}: ${issue.path}: ${issue.message}`);
		}
	}
	return hasIssue ? 1 : 0;
}
