import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allPluginProviders, syncPlugins } from "@openagentlayer/plugins";
import type { OalSource } from "@openagentlayer/source";

const MARKETPLACE_FILES = [
	".agents/plugins/marketplace.json",
	".claude-plugin/marketplace.json",
	"marketplace/claude/.claude-plugin/plugin.json",
	"marketplace/claude/.claude-plugin/marketplace.json",
	"marketplace/codex/.codex-plugin/plugin.json",
	"marketplace/opencode/package.json",
] as const;

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
		if (!parsed.name?.includes("openagentlayer"))
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
	if (entry.name !== "openagentlayer")
		throw new Error(`Marketplace ${path} does not expose OpenAgentLayer.`);
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
		"plugins/codex/openagentlayer/.codex-plugin/plugin.json",
		"plugins/codex/openagentlayer/skills/review/SKILL.md",
		"plugins/codex/openagentlayer/hooks/inject-route-context.mjs",
		"plugins/claude/openagentlayer/.claude-plugin/plugin.json",
		"plugins/claude/openagentlayer/hooks/hooks.json",
		"plugins/claude/openagentlayer/skills/review/SKILL.md",
		"plugins/opencode/openagentlayer/package.json",
		"plugins/opencode/openagentlayer/plugins/openagentlayer.ts",
	])
		await readFile(join(repoRoot, path), "utf8");
	const codexPlugin = JSON.parse(
		await readFile(
			join(repoRoot, "plugins/codex/openagentlayer/.codex-plugin/plugin.json"),
			"utf8",
		),
	) as { version?: string };
	if (codexPlugin.version !== source.version)
		throw new Error("Repo-hosted Codex plugin version drifted.");
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
			".codex/plugins/cache/openagentlayer-local/openagentlayer/0.1.0/.codex-plugin/plugin.json",
			".claude/plugins/marketplaces/openagentlayer/.claude-plugin/marketplace.json",
			".claude/plugins/cache/openagentlayer/openagentlayer/0.1.0/.claude-plugin/plugin.json",
			".claude/plugins/cache/openagentlayer/openagentlayer/0.1.0/hooks/hooks.json",
			".config/opencode/plugins/openagentlayer/package.json",
			".agents/plugins/marketplace.json",
		])
			await readFile(join(home, path), "utf8");
		const staleFile = join(
			home,
			".codex/plugins/cache/openagentlayer-local/openagentlayer/0.0.1/stale.txt",
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
		".codex/plugins/cache/openagentlayer-local/openagentlayer/0.0.1",
		".claude/plugins/cache/temp_local_openagentlayer",
		".config/opencode/plugins/cache/openagentlayer/0.0.1",
	];
	for (const path of stalePaths)
		await mkdir(join(home, path), { recursive: true });
	await writeFile(
		join(
			home,
			".codex/plugins/cache/openagentlayer-local/openagentlayer/0.0.1/stale.txt",
		),
		"stale",
	);
}
