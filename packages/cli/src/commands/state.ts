import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { renderProvider } from "@openagentlayer/adapter";
import { planDeploy } from "@openagentlayer/deploy";
import type { Provider } from "@openagentlayer/source";
import { optionalFeatureCommands } from "@openagentlayer/toolchain";
import { flag, option, providerOptions } from "../arguments";
import {
	loadProfileSelection,
	type OalProfile,
	setupArgsForProfile,
} from "../config-state";
import { renderOptions } from "../model-options";
import { expandProviders, installableProviders } from "../provider-binaries";
import { scopeArtifacts, scopeContext } from "../scope";
import { loadCheckedSource } from "../source";

interface StateReport {
	profile?: string;
	scope: string;
	target: string;
	manifest: string;
	requested: Provider[];
	available: Provider[];
	skipped: { provider: Provider; reason: string }[];
	artifacts: number;
	changes: Record<string, number>;
	removable: { provider: Provider; allowed: boolean; reason: string }[];
	optionalFeatures: {
		selected: string[];
		installCommands: number;
		removeCommands: number;
	};
	setupArgs: string[];
}

export async function runStateCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const action = args[0] ?? "inspect";
	const rest = args.slice(1);
	if (action !== "inspect")
		throw new Error(`State action \`${action}\` uses inspect`);
	const selection = await loadProfileSelection(rest);
	const stateArgs = rest.filter((arg) => arg !== "--json");
	const profile = selection.profile ?? profileFromArgs(stateArgs);
	const setupArgs = selection.profile
		? setupArgsForProfile(selection.profile, stateArgs)
		: setupArgsForProfile(profile, stateArgs);
	const context = scopeContext(setupArgs, {
		requireTarget: profile.scope === "project",
	});
	const requested = expandProviders(
		providerOptions(option(setupArgs, "--provider") ?? "all"),
	);
	const availability =
		context.scope === "global"
			? await installableProviders(requested)
			: { providers: requested, skipped: [] };
	const options = await renderOptions(setupArgs);
	const source = await loadCheckedSource(repoRoot, setupArgs);
	const artifacts = (
		await Promise.all(
			availability.providers.map((provider) =>
				renderProvider(provider, source, repoRoot, options),
			),
		)
	).flatMap((set) => set.artifacts);
	const plan = await planDeploy(
		context.targetRoot,
		scopeArtifacts(context, artifacts),
		{ scope: context.scope, manifestRoot: context.manifestRoot },
	);
	const report: StateReport = {
		...(selection.name ? { profile: selection.name } : {}),
		scope: context.scope,
		target: context.targetRoot,
		manifest: context.manifestRoot,
		requested,
		available: availability.providers,
		skipped: availability.skipped.map((skipped) => ({
			provider: skipped.provider,
			reason: skipped.reason,
		})),
		artifacts: plan.artifacts.length,
		changes: countActions(plan.changes),
		removable: await removableProviders(context.manifestRoot, requested),
		optionalFeatures: optionalFeatureState(profile),
		setupArgs,
	};
	if (flag(rest, "--json")) console.log(JSON.stringify(report, undefined, 2));
	else printStateReport(report);
}

function profileFromArgs(args: string[]): OalProfile {
	const requested = expandProviders(
		providerOptions(option(args, "--provider") ?? "all"),
	);
	return {
		providers: requested,
		scope: option(args, "--scope") === "project" ? "project" : "global",
		home: resolve(option(args, "--home") ?? homedir()),
		target: resolve(option(args, "--target") ?? "."),
	};
}

async function removableProviders(
	manifestRoot: string,
	providers: Provider[],
): Promise<StateReport["removable"]> {
	return await Promise.all(
		providers.map(async (provider) => {
			const manifest = join(manifestRoot, ".oal/manifest", `${provider}.json`);
			if (await pathExists(manifest))
				return { provider, allowed: true, reason: "owned manifest present" };
			return {
				provider,
				allowed: false,
				reason: "owned manifest is available after deploy",
			};
		}),
	);
}

function optionalFeatureState(
	profile: OalProfile,
): StateReport["optionalFeatures"] {
	const selected = profile.optionalTools ?? [];
	return {
		selected,
		installCommands: optionalFeatureCommands("install", selected).length,
		removeCommands: optionalFeatureCommands("remove", selected).length,
	};
}

function printStateReport(report: StateReport): void {
	console.log("OpenAgentLayer state");
	if (report.profile) console.log(`profile: ${report.profile}`);
	console.log(`scope: ${report.scope}`);
	console.log(`target: ${report.target}`);
	console.log(`manifest: ${report.manifest}`);
	console.log(`requested: ${report.requested.join(", ")}`);
	console.log(`available: ${report.available.join(", ") || "none"}`);
	for (const skipped of report.skipped)
		console.log(`skip ${skipped.provider}: ${skipped.reason}`);
	console.log(`artifacts: ${report.artifacts}`);
	console.log(
		`changes: write ${report.changes["write"]}, update ${report.changes["update"]}, skip ${report.changes["skip"]}, remove ${report.changes["remove"]}`,
	);
	for (const item of report.removable)
		console.log(
			`remove ${item.provider}: ${item.allowed ? "available" : "defer"} (${item.reason})`,
		);
	console.log(
		`optional: ${report.optionalFeatures.selected.join(", ") || "none"}`,
	);
	console.log(
		`optional commands: install ${report.optionalFeatures.installCommands}, remove ${report.optionalFeatures.removeCommands}`,
	);
}

function countActions(changes: { action: string }[]): Record<string, number> {
	const counts: Record<string, number> = {
		backup: 0,
		remove: 0,
		skip: 0,
		update: 0,
		write: 0,
	};
	for (const change of changes)
		counts[change.action] = (counts[change.action] ?? 0) + 1;
	return counts;
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
