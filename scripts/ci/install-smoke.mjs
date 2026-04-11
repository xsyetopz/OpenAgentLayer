import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

function run(command, args, { cwd, env } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env: { ...process.env, ...env },
			stdio: "inherit",
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
		});
	});
}

async function exists(target) {
	try {
		await stat(target);
		return true;
	} catch {
		return false;
	}
}

function wrapperInvocation(name) {
	if (process.platform === "win32") {
		return {
			command: "powershell",
			args: [
				"-NoProfile",
				"-ExecutionPolicy",
				"Bypass",
				"-File",
				path.join(ROOT, `${name}.ps1`),
			],
		};
	}
	return {
		command: "bash",
		args: [path.join(ROOT, `${name}.sh`)],
	};
}

function assertPathLabel(target) {
	return target.replace(`${ROOT}${path.sep}`, "");
}

async function assertExists(target) {
	assert.equal(
		await exists(target),
		true,
		`${assertPathLabel(target)} should exist`,
	);
}

async function assertMissing(target) {
	assert.equal(
		await exists(target),
		false,
		`${assertPathLabel(target)} should be removed`,
	);
}

function resolveManagedPaths(tempRoot) {
	const homeDir = path.join(tempRoot, "home");
	const workspace = path.join(tempRoot, "workspace");
	const appDataDir =
		process.platform === "win32"
			? path.join(tempRoot, "appdata")
			: path.join(tempRoot, "xdg");
	const managedBinDir =
		process.platform === "win32"
			? path.join(appDataDir, "openagentsbtw", "bin")
			: path.join(homeDir, ".local", "bin");
	return {
		homeDir,
		workspace,
		appDataDir,
		managedBinDir,
		configEnv: path.join(appDataDir, "openagentsbtw", "config.env"),
		claudeSettings: path.join(homeDir, ".claude", "settings.json"),
		codexConfig: path.join(homeDir, ".codex", "config.toml"),
		codexPlugin: path.join(
			homeDir,
			".codex",
			"plugins",
			"openagentsbtw",
			".codex-plugin",
			"plugin.json",
		),
		codexManagedRoot: path.join(homeDir, ".codex", "openagentsbtw"),
		projectOpenCodePlugin: path.join(
			workspace,
			".opencode",
			"plugins",
			"openagentsbtw.ts",
		),
		projectCopilotHook: path.join(
			workspace,
			".github",
			"hooks",
			"openagentsbtw.json",
		),
		globalCopilotHook: path.join(
			homeDir,
			".copilot",
			"hooks",
			"openagentsbtw.json",
		),
	};
}

async function main() {
	const tempRoot = await mkdtemp(
		path.join(os.tmpdir(), "oabtw-install-smoke-"),
	);
	const paths = resolveManagedPaths(tempRoot);
	const env = {
		CI: "true",
		HOME: paths.homeDir,
		USERPROFILE: paths.homeDir,
		APPDATA: paths.appDataDir,
		XDG_CONFIG_HOME: paths.appDataDir,
	};

	await mkdir(paths.homeDir, { recursive: true });
	await mkdir(paths.workspace, { recursive: true });
	await mkdir(paths.appDataDir, { recursive: true });

	try {
		const install = wrapperInvocation("install");
		await run(
			install.command,
			[
				...install.args,
				"--all",
				"--skip-rtk",
				"--claude-plan",
				"max-5",
				"--codex-plan",
				"pro-5",
				"--no-codex-set-top-profile",
				"--opencode-scope",
				"project",
				"--copilot-scope",
				"both",
				"--copilot-plan",
				"pro",
			],
			{ cwd: paths.workspace, env },
		);

		await assertExists(paths.claudeSettings);
		await assertExists(paths.codexConfig);
		await assertExists(paths.codexPlugin);
		await assertExists(paths.codexManagedRoot);
		await assertExists(paths.projectOpenCodePlugin);
		await assertExists(paths.projectCopilotHook);
		await assertExists(paths.globalCopilotHook);
		if (process.platform === "win32") {
			await assertExists(path.join(paths.managedBinDir, "oabtw-codex.ps1"));
			await assertExists(path.join(paths.managedBinDir, "oabtw-codex.cmd"));
		} else {
			await assertExists(path.join(paths.managedBinDir, "oabtw-codex"));
		}

		const config = wrapperInvocation("config");
		await run(
			config.command,
			[...config.args, "--copilot-plan", "pro-plus", "--codex-plan", "plus"],
			{ cwd: paths.workspace, env },
		);

		const configEnv = await readFile(paths.configEnv, "utf8");
		assert.match(configEnv, /OABTW_COPILOT_PLAN=pro-plus/);
		assert.match(configEnv, /OABTW_CODEX_PLAN=plus/);
		const codexConfig = await readFile(paths.codexConfig, "utf8");
		assert.match(codexConfig, /openagentsbtw-plus/);

		const uninstall = wrapperInvocation("uninstall");
		await run(
			uninstall.command,
			[
				...uninstall.args,
				"--all",
				"--opencode-scope",
				"project",
				"--copilot-scope",
				"both",
			],
			{ cwd: paths.workspace, env },
		);

		await assertMissing(paths.codexPlugin);
		await assertMissing(paths.codexManagedRoot);
		await assertMissing(paths.projectOpenCodePlugin);
		await assertMissing(paths.projectCopilotHook);
		await assertMissing(paths.globalCopilotHook);
		const codexConfigAfter = await readFile(paths.codexConfig, "utf8");
		assert.equal(
			codexConfigAfter.includes("# >>> openagentsbtw codex >>>"),
			false,
		);
		if (await exists(paths.claudeSettings)) {
			const claudeSettings = await readFile(paths.claudeSettings, "utf8");
			assert.equal(claudeSettings.includes("openagentsbtw"), false);
		}
	} finally {
		await rm(tempRoot, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
