import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	ensureManagedBinOnPath,
	removeChildrenWithMarker,
	removeClaudePluginCache,
	removeCodexPluginCaches,
	removeCopilotPluginCaches,
	resolvePaths,
	resolveWorkspacePaths,
	syncManagedTree,
	writeConfigEnv,
} from "../scripts/install/shared.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath) {
	return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("shared install paths", () => {
	it("resolves Windows managed paths under AppData and user home", () => {
		const homeDir = "C:\\Users\\test-user";
		const appDataDir = "C:\\Users\\test-user\\AppData\\Roaming";
		const paths = resolvePaths({
			platform: "win32",
			env: { APPDATA: appDataDir },
			homeDir,
		});
		assert.equal(
			paths.configDir,
			"C:\\Users\\test-user\\AppData\\Roaming\\openagentsbtw",
		);
		assert.equal(
			paths.opencodeConfigDir,
			"C:\\Users\\test-user\\AppData\\Roaming\\opencode",
		);
		assert.equal(
			paths.vscodeUserMcp,
			"C:\\Users\\test-user\\AppData\\Roaming\\Code\\User\\mcp.json",
		);
		assert.equal(paths.claudeHome, "C:\\Users\\test-user\\.claude");
		assert.equal(paths.codexHome, "C:\\Users\\test-user\\.codex");
		assert.equal(paths.copilotHome, "C:\\Users\\test-user\\.copilot");
		assert.equal(paths.geminiHome, "C:\\Users\\test-user\\.gemini");
		assert.equal(
			paths.cursorConfigDir,
			"C:\\Users\\test-user\\AppData\\Roaming\\Cursor",
		);
		assert.equal(
			paths.jetbrainsConfigDir,
			"C:\\Users\\test-user\\AppData\\Roaming\\JetBrains",
		);
		assert.equal(
			paths.antigravityConfigDir,
			"C:\\Users\\test-user\\AppData\\Roaming\\Antigravity",
		);
		assert.equal(
			paths.kiloConfigDir,
			"C:\\Users\\test-user\\AppData\\Roaming\\kilo",
		);
		assert.equal(
			paths.ampConfigDir,
			"C:\\Users\\test-user\\AppData\\Roaming\\amp",
		);
	});

	it("keeps Unix managed paths under XDG plus ~/.local/bin", () => {
		const paths = resolvePaths({
			platform: "linux",
			env: { XDG_CONFIG_HOME: "/tmp/xdg" },
			homeDir: "/home/test-user",
		});
		assert.equal(paths.configDir, "/tmp/xdg/openagentsbtw");
		assert.equal(paths.managedBinDir, "/home/test-user/.local/bin");
		assert.equal(paths.ctx7Wrapper, "/home/test-user/.local/bin/ctx7");
		assert.equal(
			paths.codexWrapperBinDir,
			"/home/test-user/.codex/openagentsbtw/bin",
		);
		assert.equal(paths.opencodeConfigDir, "/tmp/xdg/opencode");
		assert.equal(paths.geminiHome, "/home/test-user/.gemini");
		assert.equal(paths.cursorConfigDir, "/tmp/xdg/Cursor");
		assert.equal(paths.jetbrainsConfigDir, "/tmp/xdg/JetBrains");
		assert.equal(paths.antigravityConfigDir, "/tmp/xdg/Antigravity");
		assert.equal(paths.kiloConfigDir, "/tmp/xdg/kilo");
		assert.equal(paths.ampConfigDir, "/tmp/xdg/amp");
	});

	it("resolves project-scoped outputs under the caller workspace", () => {
		const paths = resolveWorkspacePaths("/tmp/consumer-repo", "linux");
		assert.equal(paths.projectOpenCodeDir, "/tmp/consumer-repo/.opencode");
		assert.equal(paths.projectGithubDir, "/tmp/consumer-repo/.github");
		assert.equal(paths.projectVscodeMcp, "/tmp/consumer-repo/.vscode/mcp.json");
		assert.equal(
			paths.projectCursorRulesDir,
			"/tmp/consumer-repo/.cursor/rules",
		);
		assert.equal(
			paths.projectKiroSteeringDir,
			"/tmp/consumer-repo/.kiro/steering",
		);
		assert.equal(paths.projectClineRulesDir, "/tmp/consumer-repo/.clinerules");
		assert.equal(paths.projectClineDir, "/tmp/consumer-repo/.cline");
		assert.equal(
			paths.projectAntigravityDir,
			"/tmp/consumer-repo/.antigravity",
		);
	});

	it("installs managed PATH block into zsh startup files without mutating Windows PATH", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-path-"));
		try {
			const paths = resolvePaths({
				platform: "linux",
				env: { XDG_CONFIG_HOME: path.join(root, "xdg") },
				homeDir: root,
			});
			const first = await ensureManagedBinOnPath({
				platform: "linux",
				env: { SHELL: "/bin/zsh" },
				paths,
				log: false,
			});
			const zshenv = path.join(root, ".zshenv");
			const zshrc = path.join(root, ".zshrc");
			const zshenvText = readFileSync(zshenv, "utf8");
			const zshrcText = readFileSync(zshrc, "utf8");
			const second = await ensureManagedBinOnPath({
				platform: "linux",
				env: { SHELL: "/bin/zsh" },
				paths,
				log: false,
			});
			const winPaths = resolvePaths({
				platform: "win32",
				env: { APPDATA: path.join(root, "AppData", "Roaming") },
				homeDir: path.join(root, "user"),
			});
			const windows = await ensureManagedBinOnPath({
				platform: "win32",
				env: {},
				paths: winPaths,
				log: false,
			});

			assert.equal(first.changed, true);
			assert.deepEqual(first.targets, [zshenv, zshrc]);
			assert.equal(second.changed, false);
			assert.equal(readFileSync(zshenv, "utf8"), zshenvText);
			assert.equal(readFileSync(zshrc, "utf8"), zshrcText);
			for (const text of [zshenvText, zshrcText]) {
				assert.match(
					text,
					/openagentsbtw_managed_bin="\$\{HOME\}\/\.local\/bin"/,
				);
				assert.doesNotMatch(text, /openagentsbtw_managed_rtk/);
				assert.match(text, /rtk\(\) \{ '.*\/\.local\/bin\/rtk' "\$@"; \}/);
			}
			assert.equal(windows.changed, false);
			assert.match(windows.command, /^setx PATH ".+openagentsbtw.+;%PATH%"$/);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("installs managed PATH block into bash startup files", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-bash-path-"));
		try {
			const paths = resolvePaths({
				platform: "linux",
				env: { XDG_CONFIG_HOME: path.join(root, "xdg") },
				homeDir: root,
			});
			const result = await ensureManagedBinOnPath({
				platform: "linux",
				env: { SHELL: "/bin/bash" },
				paths,
				log: false,
			});

			assert.deepEqual(result.targets, [
				path.join(root, ".bashrc"),
				path.join(root, ".profile"),
			]);
			for (const target of result.targets) {
				assert.match(
					readFileSync(target, "utf8"),
					/openagentsbtw_managed_bin="\$\{HOME\}\/\.local\/bin"/,
				);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("preserves managed RTK env in config.env", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-env-"));
		try {
			const paths = resolvePaths({
				platform: "linux",
				env: { XDG_CONFIG_HOME: path.join(root, "xdg") },
				homeDir: root,
			});
			await writeConfigEnv(
				{
					OABTW_RTK_BIN: "/home/test-user/.local/bin/rtk",
					OABTW_RTK_REPO: "/repo/vendor/rtk",
					RTK_DB_PATH: "/db/history.db",
				},
				paths,
			);
			const text = readFileSync(paths.configEnvFile, "utf8");

			assert.match(
				text,
				/^OABTW_RTK_BIN=\/home\/test-user\/\.local\/bin\/rtk$/m,
			);
			assert.match(text, /^OABTW_RTK_REPO=\/repo\/vendor\/rtk$/m);
			assert.match(text, /^RTK_DB_PATH=\/db\/history\.db$/m);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

describe("managed install cleanup", () => {
	it("removes stale files from previous managed-tree manifests", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-clean-"));
		try {
			const source = path.join(root, "source");
			const target = path.join(root, "target");
			await mkdir(source, { recursive: true });
			await writeFile(path.join(source, "current.md"), "openagentsbtw current");
			await mkdir(target, { recursive: true });
			await writeFile(path.join(target, "old.md"), "openagentsbtw stale");
			await writeFile(
				path.join(target, ".openagentsbtw-install-manifest.json"),
				JSON.stringify(["old.md"]),
			);

			await syncManagedTree(source, target);

			assert.equal(
				await readFile(path.join(target, "current.md"), "utf8"),
				"openagentsbtw current",
			);
			assert.equal(existsSync(path.join(target, "old.md")), false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("removes openagentsbtw plugin caches without touching unrelated cache entries", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-cache-"));
		try {
			const codexHome = path.join(root, ".codex");
			const claudeHome = path.join(root, ".claude");
			const copilotHome = path.join(root, ".copilot");
			const staleCodex = path.join(
				codexHome,
				"plugins",
				"cache",
				"openagentsbtw-local",
				"openagentsbtw",
				"1.4.0",
			);
			const otherCodex = path.join(
				codexHome,
				"plugins",
				"cache",
				"openagentsbtw-local",
				"other-plugin",
			);
			await mkdir(staleCodex, { recursive: true });
			await mkdir(otherCodex, { recursive: true });
			await mkdir(path.join(claudeHome, "plugins", "cache", "anything"), {
				recursive: true,
			});
			await mkdir(
				path.join(copilotHome, "installed-plugins", "openagentsbtw"),
				{
					recursive: true,
				},
			);
			await mkdir(path.join(copilotHome, "installed-plugins", "other"), {
				recursive: true,
			});
			writeFileSync(path.join(otherCodex, "keep.txt"), "keep");
			writeFileSync(
				path.join(
					copilotHome,
					"installed-plugins",
					"openagentsbtw",
					"plugin.json",
				),
				JSON.stringify({ name: "openagentsbtw" }),
			);
			writeFileSync(
				path.join(copilotHome, "installed-plugins", "other", "plugin.json"),
				JSON.stringify({ name: "other" }),
			);

			await removeCodexPluginCaches(codexHome);
			await removeClaudePluginCache(claudeHome);
			await removeCopilotPluginCaches(copilotHome);

			assert.equal(existsSync(staleCodex), false);
			assert.equal(
				readFileSync(path.join(otherCodex, "keep.txt"), "utf8"),
				"keep",
			);
			assert.equal(
				existsSync(path.join(claudeHome, "plugins", "cache")),
				false,
			);
			assert.equal(
				existsSync(
					path.join(copilotHome, "installed-plugins", "openagentsbtw"),
				),
				false,
			);
			assert.equal(
				existsSync(path.join(copilotHome, "installed-plugins", "other")),
				true,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("removes marker-owned children from shared install directories", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-marker-"));
		try {
			const dir = path.join(root, "skills");
			await mkdir(path.join(dir, "old-openagentsbtw"), { recursive: true });
			await mkdir(path.join(dir, "user-skill"), { recursive: true });
			await writeFile(
				path.join(dir, "old-openagentsbtw", "SKILL.md"),
				"openagentsbtw stale",
			);
			await writeFile(path.join(dir, "user-skill", "SKILL.md"), "personal");

			await removeChildrenWithMarker(dir);

			assert.equal(existsSync(path.join(dir, "old-openagentsbtw")), false);
			assert.equal(
				readFileSync(path.join(dir, "user-skill", "SKILL.md"), "utf8"),
				"personal",
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

describe("public entrypoints", () => {
	it("keeps shell wrappers thin and pointing at shared Node CLIs", () => {
		assert.match(readRepo("install.sh"), /scripts\/install\/cli\.mjs/);
		assert.match(readRepo("config.sh"), /scripts\/install\/config-cli\.mjs/);
		assert.match(
			readRepo("uninstall.sh"),
			/scripts\/install\/uninstall-cli\.mjs/,
		);
		assert.match(readRepo("build-plugin.sh"), /scripts\/build-plugin-cli\.mjs/);
		assert.match(readRepo("version.sh"), /scripts\/version-cli\.mjs/);
	});

	it("exposes Caveman config flags through install and config entrypoints", () => {
		const installer = readRepo("scripts/install/cli.mjs");
		const configCli = readRepo("scripts/install/config-cli.mjs");
		const shared = readRepo("scripts/install/shared.mjs");
		assert.match(installer, /--caveman-mode MODE/);
		assert.match(installer, /--no-caveman/);
		assert.match(installer, /--optional-ides/);
		assert.equal(installer.includes("--roo"), false);
		assert.match(readRepo("scripts/install/uninstall-cli.mjs"), /--roo/);
		assert.match(installer, /--antigravity/);
		assert.match(configCli, /--caveman-mode MODE/);
		assert.match(configCli, /--no-caveman/);
		assert.match(shared, /OABTW_CAVEMAN_MODE/);
	});

	it("builds managed RTK from bundled source instead of upstream bootstrap", () => {
		const installer = readRepo("scripts/install/cli.mjs");
		const configCli = readRepo("scripts/install/config-cli.mjs");
		const shared = readRepo("scripts/install/shared.mjs");
		assert.match(shared, /vendor", "rtk"/);
		assert.match(shared, /installBundledRtkBinary/);
		assert.doesNotMatch(installer, /rtk-ai\/tap\/rtk/);
		assert.doesNotMatch(configCli, /raw\.githubusercontent\.com\/rtk-ai\/rtk/);
		assert.doesNotMatch(shared, /CodeProjects", "rtk-ai", "rtk"/);
	});

	it("uses caller workspace targets for project-scoped install paths", () => {
		const installer = readRepo("scripts/install/cli.mjs");
		const uninstaller = readRepo("scripts/install/uninstall-cli.mjs");
		assert.match(installer, /resolveWorkspacePaths\(\)/);
		assert.match(installer, /workspacePaths\.projectGithubDir/);
		assert.match(installer, /workspacePaths\.projectVscodeMcp/);
		assert.match(installer, /workspacePaths\.projectOpenCodeDir/);
		assert.match(installer, /workspacePaths\.projectCursorRulesDir/);
		assert.match(installer, /workspacePaths\.projectJunieDir/);
		assert.match(uninstaller, /workspacePaths\.projectGithubDir/);
		assert.match(uninstaller, /workspacePaths\.projectOpenCodeDir/);
		assert.match(uninstaller, /workspacePaths\.projectClineRulesDir/);
		assert.equal(installer.includes('path.join(ROOT, ".github")'), false);
		assert.equal(
			installer.includes('path.join(ROOT, ".vscode", "mcp.json")'),
			false,
		);
		assert.equal(uninstaller.includes('path.join(ROOT, ".github")'), false);
		assert.equal(uninstaller.includes('path.join(ROOT, ".opencode")'), false);
	});

	it("keeps Claude settings merging Node-native instead of jq shell pipelines", () => {
		const installer = readRepo("scripts/install/cli.mjs");
		assert.match(installer, /mergeClaudeSettings/);
		assert.equal(installer.includes("jq "), false);
		assert.equal(installer.includes("ensureJq("), false);
	});

	it("installs Codex wrapper shims into the managed PATH directory", () => {
		const installer = readRepo("scripts/install/cli.mjs");
		const uninstaller = readRepo("scripts/install/uninstall-cli.mjs");
		assert.match(installer, /installCodexWrapperShims/);
		assert.match(installer, /PATHS\.managedBinDir/);
		assert.match(uninstaller, /PATHS\.managedBinDir/);
	});

	it("keeps RTK helpers Windows-safe", () => {
		for (const relativePath of [
			"claude/hooks/scripts/_rtk.mjs",
			"codex/hooks/scripts/_rtk.mjs",
			"copilot/hooks/scripts/openagentsbtw/_rtk.mjs",
		]) {
			const helper = readRepo(relativePath);
			assert.match(helper, /process\.env\.USERPROFILE/);
			assert.match(helper, /\.copilot\/RTK\.md/);
			assert.match(helper, /\.config\/opencode\/RTK\.md/);
			assert.match(helper, /process\.env\.APPDATA/);
			assert.match(helper, /env: process\.env/);
			assert.match(helper, /shell: process\.platform === "win32"/);
		}
	});

	it("ships matching PowerShell wrappers for all root entrypoints", () => {
		assert.match(readRepo("install.ps1"), /scripts\/install\/cli\.mjs/);
		assert.match(readRepo("config.ps1"), /scripts\/install\/config-cli\.mjs/);
		assert.match(
			readRepo("uninstall.ps1"),
			/scripts\/install\/uninstall-cli\.mjs/,
		);
		assert.match(
			readRepo("build-plugin.ps1"),
			/scripts\/build-plugin-cli\.mjs/,
		);
		assert.match(readRepo("version.ps1"), /scripts\/version-cli\.mjs/);
		assert.match(readRepo("install.ps1"), /Set-StrictMode -Version Latest/);
		assert.match(readRepo("build-plugin.ps1"), /\$LASTEXITCODE/);
		assert.match(readRepo("version.ps1"), /\$LASTEXITCODE/);
	});
});
