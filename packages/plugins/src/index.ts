import {
	chmod,
	mkdir,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { renderProvider } from "@openagentlayer/adapter";
import type { Artifact } from "@openagentlayer/artifact";
import type { OalSource, Provider } from "@openagentlayer/source";

export interface PluginSyncOptions {
	repoRoot: string;
	home: string;
	source: OalSource;
	providers: Provider[];
	dryRun?: boolean;
}

export interface PluginSyncChange {
	action: "write" | "remove" | "skip";
	path: string;
	reason: string;
}

export interface PluginSyncResult {
	changes: PluginSyncChange[];
}

const PROVIDERS = ["codex", "claude", "opencode"] as const;
const PLUGIN_NAME = "openagentlayer";
const CODEX_MARKETPLACE_NAME = "openagentlayer-local";

export async function syncPlugins(
	options: PluginSyncOptions,
): Promise<PluginSyncResult> {
	const version = options.source.version;
	const changes: PluginSyncChange[] = [];
	for (const provider of options.providers) {
		const artifacts = (
			await renderProvider(provider, options.source, options.repoRoot)
		).artifacts;
		await syncProvider({
			...options,
			provider,
			version,
			artifacts,
			changes,
		});
	}
	return { changes };
}

export function allPluginProviders(): Provider[] {
	return [...PROVIDERS];
}

interface ProviderSyncOptions extends PluginSyncOptions {
	provider: Provider;
	version: string;
	artifacts: Artifact[];
	changes: PluginSyncChange[];
}

async function syncProvider(options: ProviderSyncOptions): Promise<void> {
	if (options.provider === "codex") await syncCodex(options);
	else if (options.provider === "claude") await syncClaude(options);
	else await syncOpenCode(options);
}

async function syncCodex(options: ProviderSyncOptions): Promise<void> {
	const pluginRoot = join(options.home, ".codex/plugins/openagentlayer");
	const cacheRoot = join(
		options.home,
		".codex/plugins/cache/openagentlayer-local/openagentlayer",
	);
	const cacheTarget = join(cacheRoot, options.version);
	await copyMarketplace(options, "codex", pluginRoot);
	await writeProviderArtifacts(options, pluginRoot);
	await copyMarketplace(options, "codex", cacheTarget);
	await writeProviderArtifacts(options, cacheTarget);
	await writeCodexMarketplace(options, pluginRoot);
	await pruneVersionCache(options, cacheRoot);
}

async function syncClaude(options: ProviderSyncOptions): Promise<void> {
	const marketplaceRoot = join(
		options.home,
		".claude/plugins/marketplaces/openagentlayer",
	);
	const cacheRoot = join(
		options.home,
		".claude/plugins/cache/openagentlayer/openagentlayer",
	);
	const cacheTarget = join(cacheRoot, options.version);
	await writeBytes(
		options,
		join(marketplaceRoot, ".claude-plugin/marketplace.json"),
		await readFile(
			join(
				options.repoRoot,
				"marketplace/claude/.claude-plugin/marketplace.json",
			),
		),
		"marketplace payload",
	);
	await writeBytes(
		options,
		join(cacheTarget, ".claude-plugin/plugin.json"),
		await readFile(
			join(options.repoRoot, "marketplace/claude/.claude-plugin/plugin.json"),
		),
		"marketplace payload",
	);
	await writeProviderArtifacts(options, cacheTarget);
	await pruneVersionCache(options, cacheRoot);
	await removeTemporaryCaches(
		options,
		join(options.home, ".claude/plugins/cache"),
	);
}

async function syncOpenCode(options: ProviderSyncOptions): Promise<void> {
	const configRoot = join(options.home, ".config/opencode");
	const pluginRoot = join(configRoot, "plugins/openagentlayer");
	const cacheRoot = join(configRoot, "plugins/cache/openagentlayer");
	const cacheTarget = join(cacheRoot, options.version);
	await copyMarketplace(options, "opencode", pluginRoot);
	await writeProviderArtifacts(options, pluginRoot);
	await copyMarketplace(options, "opencode", cacheTarget);
	await writeProviderArtifacts(options, cacheTarget);
	await pruneVersionCache(options, cacheRoot);
}

async function copyMarketplace(
	options: ProviderSyncOptions,
	provider: Provider,
	targetRoot: string,
): Promise<void> {
	const sourceRoot = join(options.repoRoot, "marketplace", provider);
	const files = await listFiles(sourceRoot);
	for (const sourcePath of files) {
		const target = join(targetRoot, relative(sourceRoot, sourcePath));
		await writeBytes(
			options,
			target,
			await readFile(sourcePath),
			"marketplace payload",
		);
	}
}

async function writeProviderArtifacts(
	options: ProviderSyncOptions,
	targetRoot: string,
): Promise<void> {
	for (const artifact of pluginArtifacts(options.provider, options.artifacts)) {
		await writeBytes(
			options,
			join(targetRoot, artifact.targetPath),
			Buffer.from(artifact.content),
			"provider artifact",
			artifact.executable,
		);
	}
}

function pluginArtifacts(
	provider: Provider,
	artifacts: Artifact[],
): { targetPath: string; content: string; executable?: boolean }[] {
	const pluginFiles: {
		targetPath: string;
		content: string;
		executable?: boolean;
	}[] = [];
	for (const artifact of artifacts) {
		if (artifact.mode !== "file" && artifact.mode !== "config") continue;
		const targetPath = pluginTargetPath(provider, artifact.path);
		if (!targetPath) continue;
		const pluginArtifact: {
			targetPath: string;
			content: string;
			executable?: boolean;
		} = {
			targetPath,
			content: pluginContent(provider, artifact),
		};
		if (artifact.executable) pluginArtifact.executable = true;
		pluginFiles.push(pluginArtifact);
	}
	return pluginFiles;
}

function pluginTargetPath(
	provider: Provider,
	artifactPath: string,
): string | undefined {
	if (provider === "codex") {
		const prefix = ".codex/openagentlayer/";
		return artifactPath.startsWith(prefix)
			? artifactPath.replace(prefix, "")
			: undefined;
	}
	if (provider === "claude") {
		if (artifactPath === ".claude/settings.json") return "hooks/hooks.json";
		const prefix = ".claude/";
		return artifactPath.startsWith(prefix)
			? artifactPath.replace(prefix, "")
			: undefined;
	}
	const prefix = ".opencode/";
	return artifactPath.startsWith(prefix)
		? artifactPath.replace(prefix, "")
		: undefined;
}

function pluginContent(provider: Provider, artifact: Artifact): string {
	if (provider !== "claude" || artifact.path !== ".claude/settings.json")
		return artifact.content;
	const settings = JSON.parse(artifact.content) as {
		hooks?: Record<string, { type: string; command: string }[]>;
	};
	return `${JSON.stringify(
		{
			hooks: Object.fromEntries(
				Object.entries(settings.hooks ?? {}).map(([event, handlers]) => [
					event,
					handlers.map((handler) => ({
						...handler,
						command: handler.command.replace(
							".claude/hooks/scripts/",
							["${", "CLAUDE_PLUGIN_ROOT", "}"].join("") + "/hooks/scripts/",
						),
					})),
				]),
			),
		},
		null,
		2,
	)}\n`;
}

async function writeCodexMarketplace(
	options: ProviderSyncOptions,
	pluginRoot: string,
): Promise<void> {
	const path = join(options.home, ".agents/plugins/marketplace.json");
	const current = await readJson(path, {
		name: CODEX_MARKETPLACE_NAME,
		interface: { displayName: "OpenAgentLayer" },
		plugins: [],
	});
	const plugins = Array.isArray(current["plugins"])
		? (current["plugins"] as unknown[])
		: [];
	const nextPlugins = plugins.filter(
		(entry) => !(isRecord(entry) && entry["name"] === PLUGIN_NAME),
	);
	nextPlugins.push({
		name: PLUGIN_NAME,
		source: {
			source: "local",
			path: pluginRoot,
		},
		policy: {
			installation: "AVAILABLE",
			authentication: "ON_INSTALL",
		},
		category: "Productivity",
	});
	await writeText(
		options,
		path,
		`${JSON.stringify(
			{
				...current,
				name: CODEX_MARKETPLACE_NAME,
				interface: { displayName: "OpenAgentLayer" },
				plugins: nextPlugins,
			},
			null,
			2,
		)}\n`,
		"Codex marketplace entry",
	);
}

async function pruneVersionCache(
	options: ProviderSyncOptions,
	cacheRoot: string,
): Promise<void> {
	for (const entry of await safeReaddir(cacheRoot)) {
		const target = join(cacheRoot, entry);
		if (entry !== options.version)
			await removePath(options, target, "stale cache");
	}
}

async function removeTemporaryCaches(
	options: ProviderSyncOptions,
	cacheRoot: string,
): Promise<void> {
	for (const entry of await safeReaddir(cacheRoot))
		if (entry.startsWith("temp_local_"))
			await removePath(options, join(cacheRoot, entry), "stale cache");
}

async function writeText(
	options: ProviderSyncOptions,
	path: string,
	content: string,
	reason: string,
): Promise<void> {
	await writeBytes(options, path, Buffer.from(content), reason);
}

async function writeBytes(
	options: ProviderSyncOptions,
	path: string,
	content: Buffer,
	reason: string,
	executable = false,
): Promise<void> {
	options.changes.push({ action: "write", path, reason });
	if (options.dryRun) return;
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, content, executable ? { mode: 0o755 } : undefined);
	if (executable) await chmod(path, 0o755);
}

async function removePath(
	options: ProviderSyncOptions,
	path: string,
	reason: string,
): Promise<void> {
	if (!(await exists(path))) return;
	options.changes.push({ action: "remove", path, reason });
	if (options.dryRun) return;
	await rm(path, { recursive: true, force: true });
}

async function readJson(
	path: string,
	fallback: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
	} catch {
		return fallback;
	}
}

async function listFiles(root: string): Promise<string[]> {
	const entries = await safeReaddir(root);
	const files: string[] = [];
	for (const entry of entries) {
		const path = join(root, entry);
		const metadata = await stat(path);
		if (metadata.isDirectory()) files.push(...(await listFiles(path)));
		else if (metadata.isFile()) files.push(path);
	}
	return files;
}

async function safeReaddir(path: string): Promise<string[]> {
	try {
		return await readdir(path);
	} catch {
		return [];
	}
}

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
