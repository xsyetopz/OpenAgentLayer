import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathExists, readText, writeText } from "./shared.mjs";

export const CODEX_MARKETPLACE_NAME = "openagentsbtw-local";
export const CODEX_PLUGIN_NAME = "openagentsbtw";

export async function readCodexPluginManifest(pluginRoot) {
	const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
	const manifest = JSON.parse(await readText(manifestPath));
	if (manifest?.name !== CODEX_PLUGIN_NAME) {
		throw new Error(`Unexpected Codex plugin name in ${manifestPath}`);
	}
	if (!manifest.version || typeof manifest.version !== "string") {
		throw new Error(`Missing Codex plugin version in ${manifestPath}`);
	}
	return manifest;
}

export function codexPluginCacheRoot(
	codexHome,
	marketplaceName = CODEX_MARKETPLACE_NAME,
	pluginName = CODEX_PLUGIN_NAME,
) {
	return path.join(codexHome, "plugins", "cache", marketplaceName, pluginName);
}

export function codexPluginCacheTarget({
	codexHome,
	version,
	marketplaceName = CODEX_MARKETPLACE_NAME,
	pluginName = CODEX_PLUGIN_NAME,
}) {
	return path.join(
		codexPluginCacheRoot(codexHome, marketplaceName, pluginName),
		version,
	);
}

export async function removeStaleCodexPluginVersions({
	codexHome,
	keepVersion,
	marketplaceName = CODEX_MARKETPLACE_NAME,
	pluginName = CODEX_PLUGIN_NAME,
}) {
	const cacheRoot = codexPluginCacheRoot(
		codexHome,
		marketplaceName,
		pluginName,
	);
	for (const entry of await fs
		.readdir(cacheRoot, { withFileTypes: true })
		.catch(() => [])) {
		if (!entry.isDirectory() || entry.name === keepVersion) continue;
		await fs.rm(path.join(cacheRoot, entry.name), {
			recursive: true,
			force: true,
		});
	}
}

async function copyTreeStaged(source, target) {
	const tempParent = path.dirname(target);
	await fs.mkdir(tempParent, { recursive: true });
	const staging = path.join(
		tempParent,
		`.${path.basename(target)}.tmp-${process.pid}-${Date.now()}`,
	);
	await fs.rm(staging, { recursive: true, force: true });
	await fs.cp(source, staging, { recursive: true });
	await fs.rm(target, { recursive: true, force: true });
	await fs.rename(staging, target);
}

export async function installCodexPluginPayload({
	source,
	pluginTarget,
	codexHome,
	marketplaceName = CODEX_MARKETPLACE_NAME,
	pluginName = CODEX_PLUGIN_NAME,
}) {
	const manifest = await readCodexPluginManifest(source);
	const cacheTarget = codexPluginCacheTarget({
		codexHome,
		version: manifest.version,
		marketplaceName,
		pluginName,
	});
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "openagentsbtw-codex-plugin-"),
	);
	try {
		const stagedPayload = path.join(tempRoot, pluginName);
		await fs.cp(source, stagedPayload, { recursive: true });
		await copyTreeStaged(stagedPayload, pluginTarget);
		await copyTreeStaged(stagedPayload, cacheTarget);
		await removeStaleCodexPluginVersions({
			codexHome,
			keepVersion: manifest.version,
			marketplaceName,
			pluginName,
		});
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
	return { version: manifest.version, cacheTarget, pluginTarget };
}

export async function validateCodexPluginPayload({
	pluginTarget,
	codexHome,
	expectedVersion = "",
}) {
	const sourceManifest = await readCodexPluginManifest(pluginTarget);
	const version = expectedVersion || sourceManifest.version;
	const cacheTarget = codexPluginCacheTarget({ codexHome, version });
	const requiredFiles = [
		path.join(cacheTarget, ".codex-plugin", "plugin.json"),
		path.join(cacheTarget, "skills", "openagentsbtw", "SKILL.md"),
		path.join(cacheTarget, "skills", "review", "SKILL.md"),
		path.join(cacheTarget, "skills", "caveman", "SKILL.md"),
	];
	const missing = [];
	for (const filepath of requiredFiles) {
		if (!(await pathExists(filepath))) missing.push(filepath);
	}
	return { version, cacheTarget, missing };
}

export async function writeCodexMarketplace({
	target,
	pluginPath,
	marketplaceName = CODEX_MARKETPLACE_NAME,
	pluginName = CODEX_PLUGIN_NAME,
}) {
	let payload = {};
	if (await pathExists(target)) {
		try {
			payload = JSON.parse(await readText(target));
		} catch {}
	}
	payload.name = marketplaceName;
	payload.interface ??= {};
	payload.interface.displayName ??= "openagentsbtw Local Marketplace";
	const plugins = Array.isArray(payload.plugins) ? payload.plugins : [];
	payload.plugins = [
		...plugins.filter(
			(entry) =>
				!(entry && typeof entry === "object" && entry.name === pluginName),
		),
		{
			name: pluginName,
			source: { source: "local", path: pluginPath },
			policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
			category: "Productivity",
		},
	];
	await writeText(target, JSON.stringify(payload, null, 2));
}
