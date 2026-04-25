import { spawn, spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
	DEFAULT_CAVEMAN_MODE,
	resolveCavemanMode,
} from "../../source/caveman.mjs";

const __filename = fileURLToPath(import.meta.url);
export const ROOT = path.resolve(path.dirname(__filename), "..", "..");

export function resolvePaths({
	platform = process.platform,
	env = process.env,
	homeDir = os.homedir(),
} = {}) {
	const pathLib = platform === "win32" ? path.win32 : path.posix;
	const appDataDir =
		platform === "win32"
			? (env.APPDATA ?? pathLib.join(homeDir, "AppData", "Roaming"))
			: (env.XDG_CONFIG_HOME ?? pathLib.join(homeDir, ".config"));
	const configDir = pathLib.join(appDataDir, "openagentsbtw");
	const managedBinDir =
		platform === "win32"
			? pathLib.join(configDir, "bin")
			: pathLib.join(homeDir, ".local", "bin");
	const claudeHome = pathLib.join(homeDir, ".claude");
	const codexHome = pathLib.join(homeDir, ".codex");
	const agentsHome = pathLib.join(homeDir, ".agents");
	const copilotHome = pathLib.join(homeDir, ".copilot");
	const opencodeConfigDir =
		platform === "win32"
			? pathLib.join(appDataDir, "opencode")
			: pathLib.join(
					env.XDG_CONFIG_HOME ?? pathLib.join(homeDir, ".config"),
					"opencode",
				);
	const geminiHome = pathLib.join(homeDir, ".gemini");
	const kiroHome = pathLib.join(homeDir, ".kiro");
	const augmentHome = pathLib.join(homeDir, ".augment");
	const clineHome = pathLib.join(homeDir, "Documents", "Cline");
	const kiloConfigDir = pathLib.join(appDataDir, "kilo");
	const kiloRulesHome = pathLib.join(homeDir, ".kilocode");
	const ampConfigDir = pathLib.join(appDataDir, "amp");
	const clineRulesDir = pathLib.join(clineHome, "Rules");
	const cursorConfigDir =
		platform === "win32"
			? pathLib.join(appDataDir, "Cursor")
			: pathLib.join(
					platform === "darwin"
						? pathLib.join(homeDir, "Library", "Application Support")
						: (env.XDG_CONFIG_HOME ?? pathLib.join(homeDir, ".config")),
					"Cursor",
				);
	const jetbrainsConfigDir =
		platform === "win32"
			? pathLib.join(appDataDir, "JetBrains")
			: platform === "darwin"
				? pathLib.join(homeDir, "Library", "Application Support", "JetBrains")
				: pathLib.join(
						env.XDG_CONFIG_HOME ?? pathLib.join(homeDir, ".config"),
						"JetBrains",
					);
	const antigravityConfigDir =
		platform === "win32"
			? pathLib.join(appDataDir, "Antigravity")
			: platform === "darwin"
				? pathLib.join(homeDir, "Library", "Application Support", "Antigravity")
				: pathLib.join(
						env.XDG_CONFIG_HOME ?? pathLib.join(homeDir, ".config"),
						"Antigravity",
					);
	const vscodeUserMcp =
		platform === "darwin"
			? pathLib.join(
					homeDir,
					"Library",
					"Application Support",
					"Code",
					"User",
					"mcp.json",
				)
			: platform === "linux"
				? pathLib.join(
						env.XDG_CONFIG_HOME ?? pathLib.join(homeDir, ".config"),
						"Code",
						"User",
						"mcp.json",
					)
				: platform === "win32"
					? pathLib.join(appDataDir, "Code", "User", "mcp.json")
					: "";

	return {
		platform,
		homeDir,
		appDataDir,
		configDir,
		configEnvFile: pathLib.join(configDir, "config.env"),
		globalRtkMd: pathLib.join(configDir, "RTK.md"),
		managedBinDir,
		ctx7Wrapper: pathLib.join(managedBinDir, "ctx7"),
		ctx7Ps1Wrapper: pathLib.join(managedBinDir, "ctx7.ps1"),
		ctx7CmdWrapper: pathLib.join(managedBinDir, "ctx7.cmd"),
		claudeHome,
		codexHome,
		codexConfig: pathLib.join(codexHome, "config.toml"),
		codexWrapperBinDir: pathLib.join(codexHome, "openagentsbtw", "bin"),
		agentsHome,
		copilotHome,
		opencodeConfigDir,
		geminiHome,
		kiroHome,
		augmentHome,
		clineHome,
		kiloConfigDir,
		kiloRulesHome,
		ampConfigDir,
		clineRulesDir,
		cursorConfigDir,
		jetbrainsConfigDir,
		antigravityConfigDir,
		vscodeUserMcp,
	};
}

export const PATHS = resolvePaths();

export function resolveWorkspacePaths(
	workspaceRoot = process.cwd(),
	platform = process.platform,
) {
	const pathLib = platform === "win32" ? path.win32 : path.posix;
	return {
		workspaceRoot,
		projectOpenCodeDir: pathLib.join(workspaceRoot, ".opencode"),
		projectGithubDir: pathLib.join(workspaceRoot, ".github"),
		projectVscodeMcp: pathLib.join(workspaceRoot, ".vscode", "mcp.json"),
		projectCursorRulesDir: pathLib.join(workspaceRoot, ".cursor", "rules"),
		projectJunieDir: pathLib.join(workspaceRoot, ".junie"),
		projectAntigravityDir: pathLib.join(workspaceRoot, ".antigravity"),
		projectKiroSteeringDir: pathLib.join(workspaceRoot, ".kiro", "steering"),
		projectKiloRulesDir: pathLib.join(workspaceRoot, ".kilocode", "rules"),
		projectClineRulesDir: pathLib.join(workspaceRoot, ".clinerules"),
		projectClineDir: pathLib.join(workspaceRoot, ".cline"),
		projectAugmentRulesDir: pathLib.join(workspaceRoot, ".augment", "rules"),
	};
}

export function logInfo(message) {
	console.log(`  ✓ ${message}`);
}

export function logWarn(message) {
	console.warn(`  ! ${message}`);
}

export function fail(message) {
	throw new Error(message);
}

export async function pathExists(filepath) {
	try {
		await fs.stat(filepath);
		return true;
	} catch {
		return false;
	}
}

export async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

export async function readText(filepath, fallback = "") {
	try {
		return await fs.readFile(filepath, "utf8");
	} catch {
		return fallback;
	}
}

export async function writeText(filepath, content, executable = false) {
	await ensureDir(path.dirname(filepath));
	await fs.writeFile(
		filepath,
		content.endsWith("\n") ? content : `${content}\n`,
	);
	if (executable) {
		await fs.chmod(filepath, 0o755);
	}
}

export const INSTALL_MANIFEST_FILENAME = ".openagentsbtw-install-manifest.json";

async function listRelativeFiles(root, base = root) {
	let entries = [];
	for (const entry of await fs
		.readdir(root, { withFileTypes: true })
		.catch(() => [])) {
		const fullPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			entries = entries.concat(await listRelativeFiles(fullPath, base));
			continue;
		}
		if (entry.name === INSTALL_MANIFEST_FILENAME) continue;
		entries.push(path.relative(base, fullPath).split(path.sep).join("/"));
	}
	return entries.sort();
}

async function removeEmptyParents(root, filepath) {
	let current = path.dirname(filepath);
	while (current.startsWith(root) && current !== root) {
		try {
			await fs.rmdir(current);
			current = path.dirname(current);
		} catch {
			return;
		}
	}
}

export async function replaceManagedTree(source, target) {
	await fs.rm(target, { recursive: true, force: true });
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.cp(source, target, { recursive: true });
}

export async function syncManagedTree(source, target) {
	const sourceFiles = new Set(await listRelativeFiles(source));
	const manifestPath = path.join(target, INSTALL_MANIFEST_FILENAME);
	let previous = [];
	try {
		previous = JSON.parse(await readText(manifestPath, "[]")).filter(
			(entry) => typeof entry === "string",
		);
	} catch {}
	for (const relativePath of previous) {
		if (sourceFiles.has(relativePath)) continue;
		const targetPath = path.join(target, relativePath);
		await fs.rm(targetPath, { recursive: true, force: true });
		await removeEmptyParents(target, targetPath);
	}
	await fs.mkdir(target, { recursive: true });
	await fs.cp(source, target, { recursive: true });
	await writeText(manifestPath, JSON.stringify([...sourceFiles], null, 2));
}

async function pathContainsMarker(filepath, marker) {
	try {
		const stat = await fs.stat(filepath);
		if (!stat.isFile() || stat.size > 512 * 1024) return false;
		return (await fs.readFile(filepath, "utf8")).includes(marker);
	} catch {
		return false;
	}
}

async function treeContainsMarker(root, marker) {
	if (await pathContainsMarker(root, marker)) return true;
	for (const entry of await fs
		.readdir(root, { withFileTypes: true })
		.catch(() => [])) {
		const fullPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			if (await treeContainsMarker(fullPath, marker)) return true;
			continue;
		}
		if (await pathContainsMarker(fullPath, marker)) return true;
	}
	return false;
}

export async function removeChildrenWithMarker(dir, marker = "openagentsbtw") {
	for (const entry of await fs
		.readdir(dir, { withFileTypes: true })
		.catch(() => [])) {
		if (entry.name === INSTALL_MANIFEST_FILENAME) continue;
		const fullPath = path.join(dir, entry.name);
		if (await treeContainsMarker(fullPath, marker)) {
			await fs.rm(fullPath, { recursive: true, force: true });
		}
	}
}

export async function removeClaudePluginCache(claudeHome = PATHS.claudeHome) {
	await fs.rm(path.join(claudeHome, "plugins", "cache"), {
		recursive: true,
		force: true,
	});
}

export async function removeCodexPluginCaches(
	codexHome = PATHS.codexHome,
	pluginName = "openagentsbtw",
) {
	const cacheRoot = path.join(codexHome, "plugins", "cache");
	for (const marketplace of await fs.readdir(cacheRoot).catch(() => [])) {
		await fs.rm(path.join(cacheRoot, marketplace, pluginName), {
			recursive: true,
			force: true,
		});
	}
	await fs.rm(path.join(cacheRoot, pluginName), {
		recursive: true,
		force: true,
	});
}

export async function removeCopilotPluginCaches(
	copilotHome = PATHS.copilotHome,
	pluginName = "openagentsbtw",
) {
	const cacheRoot = path.join(copilotHome, "installed-plugins");
	for (const entry of await fs.readdir(cacheRoot).catch(() => [])) {
		const pluginRoot = path.join(cacheRoot, entry);
		for (const manifestName of ["plugin.json", "manifest.json"]) {
			try {
				const manifest = JSON.parse(
					await fs.readFile(path.join(pluginRoot, manifestName), "utf8"),
				);
				if (manifest?.name === pluginName) {
					await fs.rm(pluginRoot, { recursive: true, force: true });
					break;
				}
			} catch {}
		}
	}
}

export function commandExists(command) {
	const result =
		process.platform === "win32"
			? spawnSync("where", [command], {
					stdio: "ignore",
					shell: true,
				})
			: spawnSync("sh", ["-lc", `command -v ${command} >/dev/null 2>&1`], {
					stdio: "ignore",
				});
	return result.status === 0;
}

export function commandPath(command) {
	const result =
		process.platform === "win32"
			? spawnSync("where", [command], {
					encoding: "utf8",
					shell: true,
				})
			: spawnSync("sh", ["-lc", `command -v ${command}`], {
					encoding: "utf8",
				});
	if (result.status !== 0) return "";
	return (
		String(result.stdout || "")
			.split(/\r?\n/)
			.find(Boolean) || ""
	);
}

const OFFICIAL_RTK_INSTALL_URL =
	"https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh";
const OFFICIAL_RTK_GIT_URL = "https://github.com/rtk-ai/rtk";

export function managedRtkBinaryPath({
	platform = process.platform,
	paths = PATHS,
} = {}) {
	return path.join(
		paths.managedBinDir,
		platform === "win32" ? "rtk.exe" : "rtk",
	);
}

function rtkExecutableCandidates(paths = PATHS) {
	const exe = process.platform === "win32" ? "rtk.exe" : "rtk";
	const candidates = [
		commandPath("rtk"),
		paths.managedBinDir ? path.join(paths.managedBinDir, exe) : "",
		paths.homeDir ? path.join(paths.homeDir, ".local", "bin", exe) : "",
		paths.homeDir ? path.join(paths.homeDir, ".cargo", "bin", exe) : "",
		process.env.OABTW_RTK_BIN,
		process.env.OPENAGENTSBTW_RTK_BIN,
	].filter(Boolean);
	return [...new Set(candidates.map((candidate) => path.resolve(candidate)))];
}

const MANAGED_PATH_BLOCK_START = "# >>> openagentsbtw managed PATH >>>";
const MANAGED_PATH_BLOCK_END = "# <<< openagentsbtw managed PATH <<<";
const CONFIG_ENV_KEYS = [
	"CONTEXT7_API_KEY",
	"OABTW_CLAUDE_PLAN",
	"OABTW_CODEX_PLAN",
	"OABTW_COPILOT_PLAN",
	"OABTW_RTK_BIN",
	"RTK_DB_PATH",
];

function shellSingleQuote(value) {
	return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function managedBinShellValue(paths = PATHS) {
	const normalizedHome = path.resolve(paths.homeDir);
	const normalizedBin = path.resolve(paths.managedBinDir);
	const relative = path.relative(normalizedHome, normalizedBin);
	if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
		return `"\${HOME}/${relative.split(path.sep).join("/")}"`;
	}
	return shellSingleQuote(paths.managedBinDir);
}

function renderManagedPathBlock(paths = PATHS) {
	return `${MANAGED_PATH_BLOCK_START}
openagentsbtw_managed_bin=${managedBinShellValue(paths)}
case ":\${PATH}:" in
  *":\${openagentsbtw_managed_bin}:"*) ;;
  *) export PATH="\${openagentsbtw_managed_bin}:\${PATH}" ;;
esac
unset openagentsbtw_managed_bin
${MANAGED_PATH_BLOCK_END}`;
}

function stripManagedPathBlock(text) {
	const start = MANAGED_PATH_BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const end = MANAGED_PATH_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return text.replace(
		new RegExp(`\\n?${start}[\\s\\S]*?${end}\\n?`, "g"),
		"\n",
	);
}

function mergeManagedPathBlock(existing, paths = PATHS) {
	const cleaned = stripManagedPathBlock(existing).trimEnd();
	const block = renderManagedPathBlock(paths);
	return `${cleaned}${cleaned ? "\n\n" : ""}${block}\n`;
}

function managedPathShellFiles({
	platform = process.platform,
	env = process.env,
	paths = PATHS,
} = {}) {
	if (platform === "win32") return [];
	const shell = path.basename(env.SHELL || "");
	if (shell === "zsh") {
		return [
			path.join(paths.homeDir, ".zshenv"),
			path.join(paths.homeDir, ".zshrc"),
		];
	}
	if (shell === "bash") {
		return [
			path.join(paths.homeDir, ".bashrc"),
			path.join(paths.homeDir, ".profile"),
		];
	}
	return [path.join(paths.homeDir, ".profile")];
}

function windowsPathCommand(paths = PATHS) {
	return `setx PATH "${paths.managedBinDir};%PATH%"`;
}

export async function ensureManagedBinOnPath({
	platform = process.platform,
	env = process.env,
	paths = PATHS,
	log = true,
} = {}) {
	if (platform === "win32") {
		if (log) {
			logWarn(
				`Add ${paths.managedBinDir} to PATH for rtk.exe; for cmd.exe: ${windowsPathCommand(paths)}`,
			);
		}
		return { changed: false, targets: [], command: windowsPathCommand(paths) };
	}
	const targets = managedPathShellFiles({ platform, env, paths });
	const changed = [];
	for (const target of targets) {
		const existing = await readText(target, "");
		const next = mergeManagedPathBlock(existing, paths);
		if (next !== existing) {
			await writeText(target, next);
			changed.push(target);
		}
	}
	if (log) {
		for (const target of targets) {
			logInfo(`RTK PATH -> ${target}`);
		}
		logInfo(
			`Restart shell or run ${targets.map((target) => `source ${target}`).join(" && ")} to use rtk directly`,
		);
	}
	return { changed: changed.length > 0, targets };
}

export function isOfficialRtkBinary(binary = commandPath("rtk")) {
	if (!binary) return false;
	const result = spawnSync(binary, ["gain"], {
		stdio: "ignore",
		timeout: 5000,
		shell: process.platform === "win32" && binary === "rtk",
	});
	return result.status === 0;
}

export function verifiedRtkBinaryPath() {
	for (const binary of rtkExecutableCandidates()) {
		if (isOfficialRtkBinary(binary)) return binary;
	}
	return "";
}

export async function ensureOfficialRtkBinary() {
	const existingRtk = commandPath("rtk");
	if (isOfficialRtkBinary(existingRtk)) {
		await writeConfigEnv({ OABTW_RTK_BIN: existingRtk });
		logInfo(`RTK verified -> ${existingRtk}`);
		return true;
	}
	if (existingRtk) {
		logWarn(
			`Ignoring non-rtk-ai rtk at ${existingRtk}; \`rtk gain\` did not succeed`,
		);
	}
	if (process.platform !== "win32" && commandExists("curl")) {
		await run("sh", ["-lc", `curl -fsSL ${OFFICIAL_RTK_INSTALL_URL} | sh`]);
	} else if (commandExists("cargo")) {
		await run("cargo", ["install", "--git", OFFICIAL_RTK_GIT_URL]);
	} else {
		logWarn(
			"RTK installer needs curl or cargo; install from https://github.com/rtk-ai/rtk",
		);
		return false;
	}
	const installedRtk = verifiedRtkBinaryPath();
	if (!installedRtk) {
		logWarn("RTK install finished, but `rtk gain` did not verify");
		return false;
	}
	await writeConfigEnv({ OABTW_RTK_BIN: installedRtk });
	logInfo(`RTK verified -> ${installedRtk}`);
	return true;
}

export function resolveJsRunner() {
	if (commandExists("bunx")) return "bunx";
	if (commandExists("bun")) return "bunx-fallback";
	if (commandExists("pnpm")) return "pnpm";
	if (commandExists("yarn")) return "yarn";
	if (commandExists("npx")) return "npx";
	if (commandExists("npm")) return "npm-npx";
	return "none";
}

export function ctx7RunnerLine() {
	const runner = resolveJsRunner();
	switch (runner) {
		case "bunx":
			return 'exec bunx -y ctx7 "$@"';
		case "bunx-fallback":
			return 'exec bun x -y ctx7 "$@"';
		case "pnpm":
			return 'exec pnpm dlx ctx7 "$@"';
		case "yarn":
			return 'if yarn dlx --help >/dev/null 2>&1; then exec yarn dlx ctx7 "$@"; fi';
		case "none":
			return 'echo "Error: no JS package runner found for ctx7 (need bun, pnpm, yarn, or npm)." >&2; exit 1';
		default:
			return 'exec npx -y ctx7 "$@"';
	}
}

export function ctx7RunnerCommand() {
	const runner = resolveJsRunner();
	switch (runner) {
		case "bunx":
			return ["bunx", ["-y", "ctx7"]];
		case "bunx-fallback":
			return ["bun", ["x", "-y", "ctx7"]];
		case "pnpm":
			return ["pnpm", ["dlx", "ctx7"]];
		case "yarn":
			return ["yarn", ["dlx", "ctx7"]];
		case "npx":
		case "npm-npx":
			return ["npx", ["-y", "ctx7"]];
		default:
			return ["", []];
	}
}

export async function loadConfigEnv(paths = PATHS) {
	const text = await readText(paths.configEnvFile, "");
	const env = {};
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const [key, ...valueParts] = trimmed.split("=");
		if (!key) continue;
		env[key] = valueParts.join("=");
	}
	return env;
}

export async function writeConfigEnv(values, paths = PATHS) {
	await ensureDir(paths.configDir);
	const existing = await loadConfigEnv(paths);
	const next = { ...existing, ...values };
	const lines = ["# Managed by openagentsbtw"];
	for (const key of CONFIG_ENV_KEYS) {
		if (next[key]) lines.push(`${key}=${next[key]}`);
	}
	const cavemanMode =
		resolveCavemanMode(next.OABTW_CAVEMAN_MODE || "") || DEFAULT_CAVEMAN_MODE;
	if (cavemanMode) {
		lines.push(`OABTW_CAVEMAN_MODE=${cavemanMode}`);
	}
	await writeText(paths.configEnvFile, `${lines.join("\n")}\n`);
}

export async function promptToggle(
	question,
	defaultYes,
	nonInteractive = false,
) {
	if (nonInteractive) return defaultYes;
	const suffix = defaultYes ? "[Y/n]" : "[y/N]";
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		const answer = (await rl.question(`  ${question} ${suffix} `)).trim();
		if (!answer) return defaultYes;
		return /^y/i.test(answer);
	} finally {
		rl.close();
	}
}

export async function promptText(
	question,
	nonInteractive = false,
	fallback = "",
) {
	if (nonInteractive) return fallback;
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		return (await rl.question(`  ${question} `)).trim();
	} finally {
		rl.close();
	}
}

export async function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: options.stdio ?? "inherit",
			cwd: options.cwd,
			env: options.env ? { ...process.env, ...options.env } : process.env,
		});
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new Error(
					`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
				),
			);
		});
		child.on("error", reject);
	});
}

export async function capture(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "pipe", "pipe"],
			cwd: options.cwd,
			env: options.env ? { ...process.env, ...options.env } : process.env,
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("exit", (code) => {
			resolve({ code: code ?? 1, stdout, stderr });
		});
		child.on("error", reject);
	});
}

export function parseKeyValueList(entries) {
	const output = [];
	for (const entry of entries) {
		const separator = entry.indexOf("=");
		if (separator === -1) {
			fail(`Expected KEY=VALUE entry, received: ${entry}`);
		}
		output.push([entry.slice(0, separator), entry.slice(separator + 1)]);
	}
	return output;
}

export function parseBooleanFlag(argv, flag) {
	return argv.includes(flag);
}

export function parseStringFlag(argv, flag, fallback = "") {
	const index = argv.indexOf(flag);
	if (index === -1) return fallback;
	return argv[index + 1] ?? fallback;
}
