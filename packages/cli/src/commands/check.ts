import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { flag, option, providerOptions } from "../arguments";
import { expandProviders } from "../provider-binaries";
import { renderableSourceReport } from "../source";

const CODEX_COLOR_FIELD = /^color\s*=/m;

export async function runCheckCommand(
	repoRoot: string,
	args: string[] = [],
): Promise<void> {
	const verbose = flag(args, "--verbose");
	console.log("◇ Load OAL source");
	console.log("◇ Validate provider renderability");
	const report = await renderableSourceReport(repoRoot, args);
	if (verbose) {
		console.log(`source: ${report.sourceRoot}`);
		console.log(`providers: ${report.providers.join(", ")}`);
		console.log(`artifacts: ${report.artifacts}`);
		console.log(`capability gaps: ${report.unsupported}`);
	}
	if (flag(args, "--installed")) await assertInstalledState(args, verbose);
	console.log("└ ✓ OAL source and render checks passed");
}

async function assertInstalledState(
	args: string[],
	verbose: boolean,
): Promise<void> {
	const providers = expandProviders(
		providerOptions(option(args, "--provider") ?? "all"),
	);
	const home = resolve(option(args, "--home") ?? homedir());
	const target = resolve(option(args, "--target") ?? ".");
	console.log("◇ Validate installed provider state");
	for (const provider of providers) {
		if (provider === "codex") await assertCodexInstalled(home, target);
		if (provider === "claude") {
			const settings = await assertReadable(
				join(home, ".claude/settings.json"),
				"Claude global settings",
			).catch(() =>
				assertReadable(
					join(target, ".claude/settings.json"),
					"Claude project settings",
				),
			);
			assertClaudePluginActive(settings);
			await assertReadable(
				join(
					home,
					".claude/plugins/marketplaces/openagentlayer/.claude-plugin/plugin.json",
				),
				"Claude OAL plugin marketplace",
			);
			await assertNonEmptyDir(
				join(home, ".claude/plugins/cache/openagentlayer/openagentlayer"),
				"Claude OAL plugin cache",
			);
		}
		if (provider === "opencode") {
			const config = await assertReadable(
				join(home, ".config/opencode/opencode.jsonc"),
				"OpenCode global config",
			).catch(() =>
				assertReadable(
					join(target, "opencode.jsonc"),
					"OpenCode project config",
				),
			);
			assertOpenCodeInstalledConfig(config);
			await assertReadable(
				join(home, ".config/opencode/plugins/openagentlayer/package.json"),
				"OpenCode OAL plugin",
			);
			await assertNonEmptyDir(
				join(home, ".config/opencode/plugins/cache/openagentlayer"),
				"OpenCode OAL plugin cache",
			);
		}
		if (verbose) console.log(`installed: ${provider}`);
	}
}

function assertClaudePluginActive(settings: string): void {
	const parsed = JSON.parse(settings) as {
		enabledPlugins?: Record<string, boolean>;
		extraKnownMarketplaces?: Record<string, unknown>;
	};
	if (parsed.enabledPlugins?.["oal@openagentlayer"] !== true)
		throw new Error("Installed Claude settings need `$oal` plugin activation");
	if (!parsed.extraKnownMarketplaces?.["openagentlayer"])
		throw new Error(
			"Installed Claude settings need OAL marketplace registration",
		);
}

function assertOpenCodeInstalledConfig(config: string): void {
	const parsed = JSON.parse(stripJsonComments(config)) as {
		model_fallbacks?: unknown;
		plugin?: unknown;
	};
	if ("model_fallbacks" in parsed)
		throw new Error(
			"Installed OpenCode config needs current model routing without `model_fallbacks`",
		);
	if (
		!(
			Array.isArray(parsed.plugin) &&
			(parsed.plugin.includes("./plugins/openagentlayer.ts") ||
				parsed.plugin.includes("./.opencode/plugins/openagentlayer.ts"))
		)
	)
		throw new Error("Installed OpenCode config needs OAL plugin activation");
}

async function assertCodexInstalled(
	home: string,
	target: string,
): Promise<void> {
	const config = await readFirst(
		[join(home, ".codex/config.toml"), join(target, ".codex/config.toml")],
		"Codex config",
	);
	if (CODEX_COLOR_FIELD.test(config.content))
		throw new Error(
			`\`${config.path}\` needs Codex schema fields without \`color\``,
		);
	const agentDir = config.path.startsWith(home)
		? join(home, ".codex/agents")
		: join(target, ".codex/agents");
	const agent = await readFile(join(agentDir, "athena.toml"), "utf8");
	if (CODEX_COLOR_FIELD.test(agent))
		throw new Error(
			"Installed Codex agent TOML needs Codex schema fields without `color`",
		);
	if (!config.content.includes('profile = "openagentlayer"'))
		throw new Error("Installed Codex config needs OAL profile activation");
	if (!config.content.includes('[plugins."oal@openagentlayer-local"]'))
		throw new Error("Installed Codex config needs `$oal` plugin activation");
	await assertReadable(
		join(home, ".agents/plugins/marketplace.json"),
		"Codex plugin marketplace",
	);
	await assertReadable(
		join(home, ".codex/plugins/openagentlayer/.codex-plugin/plugin.json"),
		"Codex OAL plugin",
	);
	await assertNonEmptyDir(
		join(home, ".codex/plugins/cache/openagentlayer-local/oal"),
		"Codex OAL plugin cache",
	);
}

async function assertReadable(path: string, label: string): Promise<string> {
	try {
		return await readFile(path, "utf8");
	} catch {
		throw new Error(`\`${label}\` needs readable path \`${path}\``);
	}
}

async function assertNonEmptyDir(path: string, label: string): Promise<void> {
	try {
		if ((await readdir(path)).length > 0) return;
	} catch {
		// Report the same readable-path error for unavailable cache roots.
	}
	throw new Error(`\`${label}\` needs readable path \`${path}\``);
}

async function readFirst(
	paths: string[],
	label: string,
): Promise<{ path: string; content: string }> {
	for (const path of paths) {
		try {
			return { path, content: await readFile(path, "utf8") };
		} catch {
			// Try next installed scope.
		}
	}
	throw new Error(
		`\`${label}\` needs one readable path from \`${paths.join(" or ")}\``,
	);
}

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}
