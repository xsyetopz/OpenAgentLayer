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
	await copyMarketplace(options, "claude", marketplaceRoot);
	await writeProviderArtifacts(options, marketplaceRoot);
	await removeMatchingChildren(
		options,
		join(options.home, ".claude/plugins/cache"),
	);
}

async function syncOpenCode(options: ProviderSyncOptions): Promise<void> {
	const pluginRoot = join(options.home, ".opencode/plugins/openagentlayer");
	const cacheRoot = join(
		options.home,
		".opencode/plugins/cache/openagentlayer",
	);
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
	return artifacts
		.filter(
			(artifact) => artifact.mode === "file" || artifact.mode === "config",
		)
		.map((artifact) => {
			const pluginArtifact: {
				targetPath: string;
				content: string;
				executable?: boolean;
			} = {
				targetPath: artifact.path.replace(providerPrefix(provider), ""),
				content: artifact.content,
			};
			if (artifact.executable) pluginArtifact.executable = true;
			return pluginArtifact;
		});
}

function providerPrefix(provider: Provider): string {
	if (provider === "codex") return ".codex/openagentlayer/";
	if (provider === "claude") return ".claude/";
	return ".opencode/";
}

async function writeCodexMarketplace(
	options: ProviderSyncOptions,
	pluginRoot: string,
): Promise<void> {
	const path = join(options.home, ".agents/plugins/marketplace.json");
	const current = await readJson(path, { marketplaces: [] });
	const marketplaces = Array.isArray(current["marketplaces"])
		? (current["marketplaces"] as unknown[])
		: [];
	const nextMarketplaces = marketplaces.filter(
		(entry) =>
			!(
				isRecord(entry) &&
				entry["name"] === CODEX_MARKETPLACE_NAME &&
				entry["plugin"] === PLUGIN_NAME
			),
	);
	nextMarketplaces.push({
		name: CODEX_MARKETPLACE_NAME,
		plugin: PLUGIN_NAME,
		path: pluginRoot,
		version: options.version,
	});
	await writeText(
		options,
		path,
		`${JSON.stringify({ ...current, marketplaces: nextMarketplaces }, null, 2)}\n`,
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

async function removeMatchingChildren(
	options: ProviderSyncOptions,
	cacheRoot: string,
): Promise<void> {
	for (const entry of await safeReaddir(cacheRoot))
		if (isOalCacheName(entry))
			await removePath(options, join(cacheRoot, entry), "stale cache");
}

function isOalCacheName(name: string): boolean {
	return name.includes("openagentlayer") || name.startsWith("temp_local_");
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
