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
import {
	renderClaude,
	renderCodex,
	renderOpenCode,
} from "@openagentlayer/adapter";
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
const REPO_PLUGIN_ROOTS: Record<Provider, string> = {
	codex: "plugins/codex/openagentlayer",
	claude: "plugins/claude/openagentlayer",
	opencode: "plugins/opencode/openagentlayer",
};
const PROVIDER_ARTIFACT_ROOTS: Record<Provider, string> = {
	codex: ".codex",
	claude: ".claude",
	opencode: ".opencode",
};

export async function syncPlugins(
	options: PluginSyncOptions,
): Promise<PluginSyncResult> {
	const version = options.source.version;
	const changes: PluginSyncChange[] = [];
	for (const provider of options.providers) {
		await syncProvider({
			...options,
			provider,
			version,
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
	await copyPluginPayload(options, "codex", pluginRoot);
	await copyPluginPayload(options, "codex", cacheTarget);
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
	await copyPluginPayload(options, "claude", marketplaceRoot);
	await copyPluginPayload(options, "claude", cacheTarget);
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
	await copyPluginPayload(options, "opencode", pluginRoot);
	await copyPluginPayload(options, "opencode", cacheTarget);
	await pruneVersionCache(options, cacheRoot);
}

async function copyPluginPayload(
	options: ProviderSyncOptions,
	provider: Provider,
	targetRoot: string,
): Promise<void> {
	for (const metadataPath of await listFiles(
		join(options.repoRoot, REPO_PLUGIN_ROOTS[provider]),
	)) {
		const target = join(
			targetRoot,
			relative(
				join(options.repoRoot, REPO_PLUGIN_ROOTS[provider]),
				metadataPath,
			),
		);
		await copyStaticPluginFile(options, metadataPath, target);
	}
	for (const artifact of await renderProviderPluginArtifacts(
		options,
		provider,
	)) {
		if (!isPluginArtifact(artifact)) continue;
		await writeBytes(
			options,
			join(targetRoot, providerPluginPath(provider, artifact.path)),
			Buffer.from(artifact.content),
			"rendered plugin artifact",
			artifact.executable === true,
		);
	}
}

function isPluginArtifact(artifact: Artifact): boolean {
	return artifact.mode !== "config" && artifact.path !== "opencode.jsonc";
}

async function copyStaticPluginFile(
	options: ProviderSyncOptions,
	sourcePath: string,
	targetPath: string,
): Promise<void> {
	options.changes.push({
		action: "write",
		path: targetPath,
		reason: "plugin metadata",
	});
	if (options.dryRun) return;
	await mkdir(dirname(targetPath), { recursive: true });
	await writeFile(targetPath, await readFile(sourcePath));
	const metadata = await stat(sourcePath);
	if ((metadata.mode & 0o111) !== 0) await chmod(targetPath, 0o755);
}

async function renderProviderPluginArtifacts(
	options: ProviderSyncOptions,
	provider: Provider,
): Promise<Artifact[]> {
	if (provider === "codex")
		return (await renderCodex(options.source, options.repoRoot)).artifacts;
	if (provider === "claude")
		return [
			...(await renderClaude(options.source, options.repoRoot)).artifacts,
			claudeHooksPluginArtifact(options.source),
		];
	return (await renderOpenCode(options.source, options.repoRoot)).artifacts;
}

function providerPluginPath(provider: Provider, artifactPath: string): string {
	if (provider === "codex") {
		const codexPluginRoot = ".codex/openagentlayer/";
		if (artifactPath.startsWith(codexPluginRoot))
			return artifactPath.slice(codexPluginRoot.length);
	}
	const root = PROVIDER_ARTIFACT_ROOTS[provider];
	if (artifactPath === "AGENTS.md" || artifactPath === "CLAUDE.md")
		return artifactPath;
	if (artifactPath === "opencode.jsonc") return artifactPath;
	return artifactPath.startsWith(`${root}/`)
		? artifactPath.slice(root.length + 1)
		: artifactPath;
}

function claudeHooksPluginArtifact(source: OalSource): Artifact {
	const hooks: Record<string, { type: "command"; command: string }[]> = {};
	for (const hook of source.hooks) {
		for (const event of hook.events.claude ?? []) {
			const entries = hooks[event] ?? [];
			entries.push({
				type: "command",
				command: `\${CLAUDE_PLUGIN_ROOT}/hooks/scripts/${hook.script}`,
			});
			hooks[event] = entries;
		}
	}
	return {
		provider: "claude",
		path: ".claude/hooks/hooks.json",
		content: `${JSON.stringify({ hooks }, null, 2)}\n`,
		sourceId: "plugin:claude-hooks",
		mode: "file",
	};
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
