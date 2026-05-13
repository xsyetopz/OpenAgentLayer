import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
	planSetup,
	renderSetupPlan,
	type SetupScope,
} from "@openagentlayer/setup";
import {
	isExpectedContext7ApiKey,
	type OptionalTool,
	officialSkillIds,
} from "@openagentlayer/toolchain";
import { flag, option, providerOptions } from "../arguments";
import {
	configPathFromArgs,
	loadConfig,
	setupArgsForProfile,
} from "../config-state";
import { installableProviders } from "../provider-binaries";
import { runCheckCommand } from "./check";
import { runDeployCommand } from "./deploy";
import { runPluginsCommand } from "./plugins";

const INTEGER_PATTERN = /^\d+$/;
const noop = () => undefined;

export async function runSetupCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const profileName = option(args, "--profile");
	if (profileName) {
		const config = await loadConfig(configPathFromArgs(args));
		const profile = config.profiles[profileName];
		if (!profile)
			throw new Error(`Profile \`${profileName}\` is available to save first`);
		return runSetupWithArgs(repoRoot, setupArgsForProfile(profile, args));
	}
	return runSetupWithArgs(repoRoot, args);
}

async function runSetupWithArgs(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const scope: SetupScope =
		option(args, "--scope") === "project" ? "project" : "global";
	const requestedProviders = providerOptions(
		option(args, "--provider") ?? "all",
	);
	const availability = await installableProviders(requestedProviders);
	const providers = availability.providers;
	const home = resolve(option(args, "--home") ?? homedir());
	const target = resolve(option(args, "--target") ?? process.cwd());
	const binDir = resolve(option(args, "--bin-dir") ?? join(home, ".local/bin"));
	const optionalTools = setupOptionalTools(args);
	const dryRun = flag(args, "--dry-run");
	const quiet = flag(args, "--quiet");
	const verbose = flag(args, "--verbose");
	const rtk = flag(args, "--rtk");
	const context7ApiKey = option(args, "--context7-api-key");
	if (context7ApiKey && !isExpectedContext7ApiKey(context7ApiKey))
		throw new Error("Context7 API key must start with ctx7sk-");
	const setupOptions = {
		providers,
		skippedProviders: availability.skipped,
		scope,
		home,
		target: scope === "global" ? home : target,
		repoRoot,
		optionalTools,
		toolchain: flag(args, "--toolchain"),
		hasHomebrew: commandExists("brew"),
		rtk,
		dryRun,
		...(context7ApiKey ? { context7ApiKey } : {}),
	};
	const plan = planSetup(
		scope === "global" ? { ...setupOptions, binDir } : setupOptions,
	);
	if (!quiet || dryRun) console.log(renderSetupPlan(plan).trimEnd());
	if (providers.length === 0) {
		console.log(
			"└ ⚠ No selected provider binaries found; setup wrote nothing.",
		);
		return;
	}
	await runOptionalSetup(
		plan.phases[0]?.name === "toolchain" ? plan.phases[0].commands : [],
		{ dryRun, quiet },
	);
	const providerArg = providers.join(",");
	const common = [
		"--provider",
		providerArg,
		"--scope",
		scope,
		...passthroughRenderArgs(args),
	];
	await runDeployCommand(repoRoot, [
		...common,
		...(scope === "global"
			? ["--home", home, "--bin-dir", binDir]
			: ["--target", target]),
		...(dryRun ? ["--dry-run"] : []),
		...(quiet ? ["--quiet"] : []),
		...(verbose ? ["--verbose"] : []),
	]);
	await runPluginsCommand(repoRoot, [
		"--provider",
		providerArg,
		"--home",
		home,
		...passthroughRenderArgs(args),
		...(dryRun ? ["--dry-run"] : []),
		...(quiet ? ["--quiet"] : []),
		...(verbose ? ["--verbose"] : []),
	]);
	await runCheckCommand(repoRoot, [
		...(verbose ? ["--verbose"] : []),
		...(dryRun
			? []
			: [
					"--installed",
					"--provider",
					providerArg,
					"--home",
					home,
					...(scope === "project" ? ["--target", target] : []),
				]),
	]);
}

function commandExists(command: string): boolean {
	return (
		spawnSync("sh", ["-lc", `command -v ${command}`], {
			stdio: "ignore",
		}).status === 0
	);
}

function setupOptionalTools(args: string[]): OptionalTool[] {
	const tools = new Set<OptionalTool>();
	for (const tool of (option(args, "--optional") ?? "").split(",")) {
		if (
			tool === "ctx7" ||
			tool === "deepwiki" ||
			tool === "playwright" ||
			officialSkillIds().includes(
				tool as ReturnType<typeof officialSkillIds>[number],
			)
		)
			tools.add(tool as OptionalTool);
	}
	if (flag(args, "--ctx7-cli")) tools.add("ctx7");
	if (flag(args, "--playwright-cli")) tools.add("playwright");
	if (flag(args, "--deepwiki-mcp")) tools.add("deepwiki");
	return [...tools];
}

function passthroughRenderArgs(args: string[]): string[] {
	const result: string[] = [];
	for (const name of [
		"--plan",
		"--codex-plan",
		"--codex-orchestration",
		"--codex-agent-max-depth",
		"--codex-agent-max-threads",
		"--codex-agent-job-max-runtime-seconds",
		"--codex-multi-agent-v2-max-concurrent-threads-per-session",
		"--codex-multi-agent-v2-min-wait-timeout-ms",
		"--codex-multi-agent-v2-hide-spawn-agent-metadata",
		"--codex-multi-agent-v2-usage-hint-enabled",
		"--codex-multi-agent-v2-usage-hint-text",
		"--codex-multi-agent-v2-root-usage-hint-text",
		"--codex-multi-agent-v2-subagent-usage-hint-text",
		"--claude-plan",
		"--opencode-plan",
		"--opencode-models-file",
		"--caveman-mode",
	]) {
		const value = option(args, name);
		if (value) result.push(name, value);
	}
	return result;
}

async function runOptionalSetup(
	commands: string[],
	options: { dryRun: boolean; quiet: boolean },
): Promise<void> {
	if (commands.length === 0) return;
	if (options.dryRun) return;
	for (const [index, command] of commands.entries()) {
		const result = await runOptionalSetupCommand(command, {
			...options,
			index: index + 1,
			total: commands.length,
		});
		if (result.ok) continue;
		if (!options.quiet) printOptionalSetupFailure(command, result);
	}
}

interface OptionalSetupRunOptions {
	quiet: boolean;
	index: number;
	total: number;
	timeoutMs?: number;
	idleTimeoutMs?: number;
}

interface OptionalSetupRunResult {
	ok: boolean;
	code: number | null;
	timedOut: boolean;
	timedOutReason?: string;
	stdout: string;
	stderr: string;
}

export async function runOptionalSetupCommand(
	command: string,
	options: OptionalSetupRunOptions,
): Promise<OptionalSetupRunResult> {
	const timeoutMs = options.timeoutMs ?? optionalSetupTimeoutMs();
	const idleTimeoutMs = options.idleTimeoutMs ?? optionalSetupIdleTimeoutMs();
	if (!options.quiet)
		console.log(
			color("cyan", `◇ Optional setup ${options.index}/${options.total}`),
		);
	if (!options.quiet) console.log(color("dim", `  $ ${command}`));
	const child = Bun.spawn(["sh", "-lc", command], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const spinner = options.quiet
		? undefined
		: startSpinner(`running optional setup ${options.index}/${options.total}`);
	let stdout = "";
	let stderr = "";
	let timedOut = false;
	let timedOutReason: string | undefined;
	const stopForTimeout = (reason: string) => {
		if (timedOut) return;
		timedOut = true;
		timedOutReason = reason;
		spinner?.stop(reason);
		terminateProcessTree(child.pid);
		child.kill();
	};
	const timeout = setTimeout(() => {
		stopForTimeout(`timed out after ${formatDuration(timeoutMs)}`);
	}, timeoutMs);
	let idleTimeout: ReturnType<typeof setTimeout> | undefined;
	const resetIdleTimeout = () => {
		if (idleTimeout) clearTimeout(idleTimeout);
		if (idleTimeoutMs <= 0) return;
		idleTimeout = setTimeout(() => {
			stopForTimeout(`no output for ${formatDuration(idleTimeoutMs)}`);
		}, idleTimeoutMs);
	};
	resetIdleTimeout();
	const [, , code] = await Promise.all([
		streamCommandOutput(child.stdout, {
			quiet: options.quiet,
			write: (chunk) => process.stdout.write(chunk),
			beforeWrite: () => spinner?.clear(),
			remember: (chunk) => {
				stdout = tail(`${stdout}${chunk}`);
				resetIdleTimeout();
			},
		}),
		streamCommandOutput(child.stderr, {
			quiet: options.quiet,
			write: (chunk) => process.stderr.write(chunk),
			beforeWrite: () => spinner?.clear(),
			remember: (chunk) => {
				stderr = tail(`${stderr}${chunk}`);
				resetIdleTimeout();
			},
		}),
		child.exited,
	]).finally(() => {
		clearTimeout(timeout);
		if (idleTimeout) clearTimeout(idleTimeout);
	});
	spinner?.finish();
	if (!options.quiet && code === 0)
		console.log(color("green", "└ ✓ optional setup completed"));
	return {
		ok: code === 0,
		code,
		timedOut,
		...(timedOutReason ? { timedOutReason } : {}),
		stdout,
		stderr,
	};
}

async function streamCommandOutput(
	stream: ReadableStream<Uint8Array> | null,
	options: {
		quiet: boolean;
		write: (chunk: string) => void;
		beforeWrite: () => void;
		remember: (chunk: string) => void;
	},
): Promise<void> {
	if (!stream) return;
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		const chunk = decoder.decode(value, { stream: true });
		options.remember(chunk);
		if (!options.quiet) {
			options.beforeWrite();
			options.write(chunk);
		}
	}
	const final = decoder.decode();
	if (!final) return;
	options.remember(final);
	if (!options.quiet) {
		options.beforeWrite();
		options.write(final);
	}
}

function printOptionalSetupFailure(
	command: string,
	result: OptionalSetupRunResult,
): void {
	const lines = [
		color("yellow", `! optional setup command failed (${command})`),
		`  exit: ${result.code ?? "unknown"}`,
		...(result.timedOut
			? [`  reason: ${result.timedOutReason ?? "timed out"}`]
			: []),
		...(result.stdout.trim() ? [`  stdout: ${result.stdout.trim()}`] : []),
		...(result.stderr.trim() ? [`  stderr: ${result.stderr.trim()}`] : []),
		"  continuing with provider-native setup and system CLI fallbacks",
	];
	console.warn(lines.join("\n"));
}

function tail(text: string, limit = 4000): string {
	return text.length <= limit ? text : text.slice(text.length - limit);
}

function optionalSetupTimeoutMs(): number {
	const raw = process.env["OAL_SETUP_COMMAND_TIMEOUT_MS"];
	if (raw && INTEGER_PATTERN.test(raw)) return Number(raw);
	return 15 * 60 * 1000;
}

function optionalSetupIdleTimeoutMs(): number {
	const raw = process.env["OAL_SETUP_IDLE_TIMEOUT_MS"];
	if (raw && INTEGER_PATTERN.test(raw)) return Number(raw);
	return 2 * 60 * 1000;
}

function terminateProcessTree(pid: number | undefined): void {
	if (!pid) return;
	const children = spawnSync("pgrep", ["-P", String(pid)], {
		encoding: "utf8",
	});
	for (const childPid of children.stdout
		.split("\n")
		.map((line) => Number(line.trim()))
		.filter((value) => Number.isInteger(value) && value > 0)) {
		terminateProcessTree(childPid);
		try {
			process.kill(childPid, "SIGTERM");
		} catch {
			// Best effort: the process may have exited between pgrep and kill.
		}
	}
}

function startSpinner(message: string): {
	clear: () => void;
	finish: () => void;
	stop: (finalMessage: string) => void;
} {
	if (!spinnerEnabled()) {
		console.log(color("dim", `  ${message}...`));
		return {
			clear: noop,
			finish: noop,
			stop: noop,
		};
	}
	const frames = ["|", "/", "-", "\\"];
	let index = 0;
	let active = true;
	const startedAt = Date.now();
	const render = () => {
		if (!active) return;
		process.stdout.write(
			`\r${color("cyan", frames[index % frames.length])} ${message} (${formatDuration(Date.now() - startedAt)})...`,
		);
		index += 1;
	};
	const clear = () => {
		if (!active) return;
		process.stdout.write("\r\u001b[2K");
	};
	render();
	const timer = setInterval(render, 120);
	return {
		clear,
		finish: () => {
			if (!active) return;
			active = false;
			clearInterval(timer);
			process.stdout.write("\r\u001b[2K");
		},
		stop: (finalMessage: string) => {
			if (!active) return;
			active = false;
			clearInterval(timer);
			process.stdout.write(
				`\r\u001b[2K${color("yellow", `! ${finalMessage}`)}\n`,
			);
		},
	};
}

function spinnerEnabled(): boolean {
	if (process.env["NO_COLOR"]) return false;
	if (process.env["FORCE_COLOR"] && process.env["FORCE_COLOR"] !== "0")
		return true;
	return process.stdout.isTTY === true;
}

function formatDuration(ms: number): string {
	const seconds = Math.max(0, Math.ceil(ms / 1000));
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (minutes === 0) return `${remainingSeconds}s`;
	return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function color(
	name: "cyan" | "dim" | "green" | "yellow",
	text: string,
): string {
	if (!colorEnabled()) return text;
	const codes = {
		cyan: 36,
		dim: 2,
		green: 32,
		yellow: 33,
	} as const;
	return `\u001b[${codes[name]}m${text}\u001b[0m`;
}

function colorEnabled(): boolean {
	if (process.env["NO_COLOR"]) return false;
	if (process.env["FORCE_COLOR"] && process.env["FORCE_COLOR"] !== "0")
		return true;
	return process.stdout.isTTY === true;
}
