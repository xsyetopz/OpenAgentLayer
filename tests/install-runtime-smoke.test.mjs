import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runNode(script, args, env, cwd) {
	return spawnSync("node", [script, ...args], {
		cwd,
		env: { ...process.env, ...env },
		encoding: "utf8",
		timeout: 20000,
	});
}

describe("installer runtime smoke", () => {
	it("installs and uninstalls core surfaces without agentic-ides artifacts", {
		timeout: 15000,
	}, () => {
		const tempRoot = mkdtempSync(
			path.join(os.tmpdir(), "oabtw-runtime-smoke-"),
		);
		const homeDir = path.join(tempRoot, "home");
		const appDataDir =
			process.platform === "win32"
				? path.join(tempRoot, "appdata")
				: path.join(tempRoot, "xdg");
		const workspace = path.join(tempRoot, "workspace");
		const env = {
			HOME: homeDir,
			USERPROFILE: homeDir,
			APPDATA: appDataDir,
			XDG_CONFIG_HOME: appDataDir,
			CI: "true",
		};
		mkdirSync(workspace, { recursive: true });
		mkdirSync(homeDir, { recursive: true });
		mkdirSync(appDataDir, { recursive: true });

		try {
			const install = runNode(
				path.join(ROOT, "scripts", "install", "cli.mjs"),
				[
					"--all",
					"--skip-rtk",
					"--claude-plan",
					"max-5",
					"--codex-plan",
					"pro-5",
					"--copilot-scope",
					"both",
					"--opencode-scope",
					"project",
					"--caveman-mode",
					"full",
					"--no-ctx7-cli",
					"--no-playwright-cli",
				],
				env,
				workspace,
			);
			assert.equal(install.status, 0, install.stderr || install.stdout);

			assert.equal(
				existsSync(path.join(workspace, ".openagentsbtw", "agentic")),
				false,
			);
			assert.equal(
				existsSync(path.join(appDataDir, "openagentsbtw", "agentic", "hooks")),
				false,
			);
			assert.equal(existsSync(path.join(workspace, ".roo")), false);
			assert.equal(existsSync(path.join(workspace, ".cursor")), false);
			assert.equal(existsSync(path.join(workspace, ".clinerules")), false);

			const uninstall = runNode(
				path.join(ROOT, "scripts", "install", "uninstall-cli.mjs"),
				["--all", "--opencode-scope", "project", "--copilot-scope", "both"],
				env,
				workspace,
			);
			assert.equal(uninstall.status, 0, uninstall.stderr || uninstall.stdout);
			assert.equal(
				existsSync(
					path.join(
						homeDir,
						".codex",
						"plugins",
						"openagentsbtw",
						".codex-plugin",
					),
				),
				false,
			);
		} finally {
			rmSync(tempRoot, { recursive: true, force: true });
		}
	});

	it("installs detected optional IDE surfaces only", () => {
		const tempRoot = mkdtempSync(
			path.join(os.tmpdir(), "oabtw-optional-ides-"),
		);
		const homeDir = path.join(tempRoot, "home");
		const appDataDir =
			process.platform === "win32"
				? path.join(tempRoot, "appdata")
				: path.join(tempRoot, "xdg");
		const workspace = path.join(tempRoot, "workspace");
		const env = {
			HOME: homeDir,
			USERPROFILE: homeDir,
			APPDATA: appDataDir,
			XDG_CONFIG_HOME: appDataDir,
			CI: "true",
			OABTW_TEST_PRESENT_IDES: "roo,cline,cursor,junie,antigravity",
		};
		mkdirSync(workspace, { recursive: true });
		mkdirSync(homeDir, { recursive: true });
		mkdirSync(appDataDir, { recursive: true });

		try {
			const install = runNode(
				path.join(ROOT, "scripts", "install", "cli.mjs"),
				[
					"--optional-ides",
					"--skip-rtk",
					"--caveman-mode",
					"full",
					"--no-ctx7-cli",
					"--no-playwright-cli",
				],
				env,
				workspace,
			);
			assert.equal(install.status, 0, install.stderr || install.stdout);
			assert.equal(
				existsSync(path.join(workspace, ".roo", "rules", "openagentsbtw.md")),
				false,
			);
			assert.equal(existsSync(path.join(workspace, ".roomodes")), false);
			assert.equal(
				existsSync(path.join(workspace, ".clinerules", "openagentsbtw.md")),
				true,
			);
			assert.equal(
				existsSync(
					path.join(workspace, ".cline", "skills", "openagentsbtw", "SKILL.md"),
				),
				true,
			);
			assert.equal(
				existsSync(
					path.join(workspace, ".cursor", "rules", "openagentsbtw.mdc"),
				),
				true,
			);
			assert.equal(
				existsSync(path.join(workspace, ".junie", "AGENTS.md")),
				true,
			);
			assert.equal(existsSync(path.join(workspace, "AGENTS.md")), true);
			assert.equal(existsSync(path.join(workspace, "GEMINI.md")), true);
			mkdirSync(path.join(workspace, ".roo", "rules"), { recursive: true });
			writeFileSync(
				path.join(workspace, ".roo", "rules", "openagentsbtw.md"),
				"legacy Roo Code rules",
			);
			writeFileSync(path.join(workspace, ".roomodes"), "{}");

			const uninstall = runNode(
				path.join(ROOT, "scripts", "install", "uninstall-cli.mjs"),
				["--optional-ides"],
				env,
				workspace,
			);
			assert.equal(uninstall.status, 0, uninstall.stderr || uninstall.stdout);
			assert.equal(
				existsSync(path.join(workspace, ".roo", "rules", "openagentsbtw.md")),
				false,
			);
			assert.equal(existsSync(path.join(workspace, ".roomodes")), false);
			assert.equal(
				existsSync(
					path.join(workspace, ".cursor", "rules", "openagentsbtw.mdc"),
				),
				false,
			);
		} finally {
			rmSync(tempRoot, { recursive: true, force: true });
		}
	});
});
