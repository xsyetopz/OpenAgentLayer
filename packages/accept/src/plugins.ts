import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allPluginProviders, syncPlugins } from "@openagentlayer/plugins";
import type { OalSource } from "@openagentlayer/source";

const MARKETPLACE_FILES = [
	".agents/plugins/marketplace.json",
	".claude-plugin/marketplace.json",
	"plugins/claude/openagentlayer/.claude-plugin/plugin.json",
	"plugins/codex/openagentlayer/.codex-plugin/plugin.json",
	"plugins/opencode/openagentlayer/package.json",
] as const;
const REPO_PLUGIN_METADATA = new Set<string>([
	"plugins/claude/openagentlayer/.claude-plugin/plugin.json",
	"plugins/codex/openagentlayer/.codex-plugin/plugin.json",
	"plugins/opencode/openagentlayer/package.json",
]);

export async function assertPluginMarketplace(
	repoRoot: string,
	source: OalSource,
): Promise<void> {
	for (const path of MARKETPLACE_FILES) {
		const content = await readFile(join(repoRoot, path), "utf8");
		const parsed = JSON.parse(content) as {
			name?: string;
			version?: string;
			plugins?: unknown;
		};
		if (
			path.endsWith(".codex-plugin/plugin.json") ||
			path.endsWith(".claude-plugin/plugin.json")
		) {
			if (parsed.name !== "oal")
				throw new Error(`Plugin payload ${path} is not named $oal.`);
		} else if (!parsed.name?.includes("openagentlayer"))
			throw new Error(
				`Marketplace payload ${path} is not named OpenAgentLayer.`,
			);
		if (path.endsWith("plugin.json") && parsed.version !== source.version)
			throw new Error(`Marketplace payload ${path} version drifted.`);
		if (path.endsWith("marketplace.json"))
			assertMarketplaceEntry(path, parsed.plugins);
	}
	await assertRepositoryPluginPayloads(repoRoot, source);
	await assertPluginSync(repoRoot, source);
}

function assertMarketplaceEntry(path: string, plugins: unknown): void {
	if (!Array.isArray(plugins) || plugins.length === 0)
		throw new Error(`Marketplace ${path} has no plugins.`);
	const entry = plugins[0] as {
		name?: string;
		source?: { source?: string; path?: string; url?: string; ref?: string };
		policy?: { installation?: string; authentication?: string };
		category?: string;
	};
	if (entry.name !== "oal")
		throw new Error(`Marketplace ${path} does not expose $oal.`);
	if (path.startsWith(".agents/")) {
		if (entry.source?.source !== "git-subdir")
			throw new Error("Codex marketplace must use a git-subdir source.");
		if (entry.source.path !== "./plugins/codex/openagentlayer")
			throw new Error("Codex marketplace source path is not repo-hosted.");
		if (
			entry.policy?.installation !== "AVAILABLE" ||
			entry.policy.authentication !== "ON_INSTALL" ||
			!entry.category
		)
			throw new Error("Codex marketplace missing install policy metadata.");
	}
	if (path.startsWith(".claude-plugin/")) {
		if (entry.source?.source !== "git-subdir")
			throw new Error("Claude marketplace must use a git-subdir source.");
		if (entry.source.path !== "plugins/claude/openagentlayer")
			throw new Error("Claude marketplace source path is not repo-hosted.");
	}
}

async function assertRepositoryPluginPayloads(
	repoRoot: string,
	source: OalSource,
): Promise<void> {
	for (const path of [
		".agents/plugins/marketplace.json",
		".claude-plugin/marketplace.json",
		...REPO_PLUGIN_METADATA,
	])
		await readFile(join(repoRoot, path), "utf8");
	await assertNoRepositoryGeneratedPluginPayloads(repoRoot);
	const codexPlugin = JSON.parse(
		await readFile(
			join(repoRoot, "plugins/codex/openagentlayer/.codex-plugin/plugin.json"),
			"utf8",
		),
	) as { version?: string };
	if (codexPlugin.version !== source.version)
		throw new Error("Repo-hosted Codex plugin version drifted.");
}

async function assertNoRepositoryGeneratedPluginPayloads(
	repoRoot: string,
): Promise<void> {
	for (const file of await listFiles(join(repoRoot, "plugins"))) {
		const relativePath = file.slice(repoRoot.length + 1);
		if (!REPO_PLUGIN_METADATA.has(relativePath))
			throw new Error(
				`Repository plugin directory contains generated payload ${relativePath}.`,
			);
	}
}

async function assertPluginSync(
	repoRoot: string,
	source: OalSource,
): Promise<void> {
	const home = await mkdtemp(join(tmpdir(), "oal-plugin-accept-"));
	try {
		await seedStalePluginCaches(home);
		const preview = await syncPlugins({
			repoRoot,
			home,
			source,
			providers: allPluginProviders(),
			dryRun: true,
		});
		if (!preview.changes.some((change) => change.action === "write"))
			throw new Error("Plugin dry-run did not plan payload writes.");
		const applied = await syncPlugins({
			repoRoot,
			home,
			source,
			providers: allPluginProviders(),
		});
		if (!applied.changes.some((change) => change.action === "remove"))
			throw new Error("Plugin sync did not prune stale OAL caches.");
		for (const path of [
			".codex/plugins/openagentlayer/.codex-plugin/plugin.json",
			".codex/plugins/openagentlayer/AGENTS.md",
			`.codex/plugins/cache/openagentlayer-local/oal/${source.version}/.codex-plugin/plugin.json`,
			".codex/config.toml",
			".claude/plugins/marketplaces/openagentlayer/.claude-plugin/plugin.json",
			`.claude/plugins/cache/openagentlayer/openagentlayer/${source.version}/.claude-plugin/plugin.json`,
			`.claude/plugins/cache/openagentlayer/openagentlayer/${source.version}/hooks/hooks.json`,
			".config/opencode/plugins/openagentlayer/package.json",
			".agents/plugins/marketplace.json",
		])
			await readFile(join(home, path), "utf8");
		const codexConfig = await readFile(
			join(home, ".codex/config.toml"),
			"utf8",
		);
		if (!codexConfig.includes('[plugins."oal@openagentlayer-local"]'))
			throw new Error("Plugin sync did not activate $oal for Codex.");
		const staleFile = join(
			home,
			".codex/plugins/cache/openagentlayer-local/oal/0.0.1/stale.txt",
		);
		let staleExists = true;
		try {
			await readFile(staleFile, "utf8");
		} catch {
			staleExists = false;
		}
		if (staleExists)
			throw new Error("Plugin sync left stale Codex cache behind.");
	} finally {
		await rm(home, { recursive: true, force: true });
	}
}

async function seedStalePluginCaches(home: string): Promise<void> {
	const stalePaths = [
		".codex/plugins/cache/openagentlayer-local/oal/0.0.1",
		".claude/plugins/cache/temp_local_openagentlayer",
		".config/opencode/plugins/cache/openagentlayer/0.0.1",
	];
	for (const path of stalePaths)
		await mkdir(join(home, path), { recursive: true });
	await writeFile(
		join(home, ".codex/plugins/cache/openagentlayer-local/oal/0.0.1/stale.txt"),
		"stale",
	);
}

async function listFiles(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) files.push(...(await listFiles(path)));
		else if (entry.isFile()) files.push(path);
	}
	return files;
}
