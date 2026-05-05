import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { flag, option, providerOptions } from "../arguments";
import { expandProviders } from "../provider-binaries";
import { runDeployCommand } from "./deploy";

type E2eProvider = "codex" | "claude" | "opencode";

const OAL_EVIDENCE_PATTERN = /OAL|OpenAgentLayer|\.codex|\.opencode/i;
const CLAUDE_EVIDENCE_PATTERN = /OAL|OpenAgentLayer|\.claude\/settings\.json/i;
const BUNX_HOOK_PATTERN = /rtk proxy -- bunx prettier foo\.js/;

export async function runProviderE2eCommand(
	repoRoot: string,
	args: string[] = [],
): Promise<void> {
	const requested = expandProviders(
		providerOptions(option(args, "--provider") ?? "all"),
	).filter(
		(provider): provider is E2eProvider =>
			provider === "codex" || provider === "claude" || provider === "opencode",
	);
	const live = flag(args, "--live");
	console.log("# OAL Provider E2E");
	for (const provider of requested) {
		const available = await printVersion(provider);
		if (!available) continue;
		if (provider === "opencode") await printOpenCodeModels();
		if (live) await runLivePrompt(repoRoot, provider);
		else
			console.log(
				`${provider}: STATUS READY live prompt skipped; pass --live to spend provider tokens and test hooks.`,
			);
	}
}

async function printVersion(provider: E2eProvider): Promise<boolean> {
	const result = await run(
		provider,
		provider === "codex" ? ["--version"] : ["--version"],
		process.cwd(),
	);
	if (result.code === 127) {
		console.log(`${provider}: STATUS BLOCKED binary not found in PATH`);
		return false;
	}
	if (result.code !== 0) {
		console.log(
			`${provider}: STATUS BLOCKED binary check failed: ${result.stderr.trim() || result.stdout.trim()}`,
		);
		return false;
	}
	console.log(`${provider}: version ${result.stdout.trim()}`);
	return true;
}

async function printOpenCodeModels(): Promise<void> {
	const stateRoot = await mkdtemp(
		join(tmpdir(), "oal-provider-e2e-opencode-state-"),
	);
	try {
		const result = await run("opencode", ["models", "--pure"], process.cwd(), {
			XDG_CONFIG_HOME: join(stateRoot, "config"),
			XDG_DATA_HOME: join(stateRoot, "data"),
		});
		if (result.code === 0) {
			console.log("opencode: models OK");
			return;
		}
		console.log(
			`opencode: STATUS BLOCKED model/auth check failed: ${result.stderr.trim() || result.stdout.trim()}`,
		);
	} finally {
		await rm(stateRoot, { recursive: true, force: true });
	}
}

async function runLivePrompt(
	repoRoot: string,
	provider: E2eProvider,
): Promise<void> {
	if (provider === "codex") {
		await runCodexLivePrompt(repoRoot);
		return;
	}
	if (provider === "claude") {
		await runClaudeLivePrompt(repoRoot);
		return;
	}
	const fixture = await mkdtemp(
		join(tmpdir(), `oal-provider-e2e-${provider}-`),
	);
	const stateRoot = await mkdtemp(
		join(tmpdir(), "oal-provider-e2e-opencode-state-"),
	);
	try {
		await runDeployCommand(repoRoot, [
			"--target",
			fixture,
			"--provider",
			provider,
			"--scope",
			"project",
			...(provider === "opencode" ? ["--opencode-plan", "opencode-free"] : []),
			"--quiet",
		]);
		await runDeployedRuntimeChecks(fixture, provider);
		const prompt =
			"Report whether OAL provider config loaded. Do not edit files. Attempt no shell mutation. Final answer must mention OAL and loaded config paths only.";
		const result = await run(
			"opencode",
			[
				"run",
				"--dir",
				fixture,
				"--format",
				"json",
				"--model",
				"opencode/gpt-5-nano",
				prompt,
			],
			fixture,
			{
				XDG_CONFIG_HOME: join(stateRoot, "config"),
				XDG_DATA_HOME: join(stateRoot, "data"),
			},
		);
		const output = `${result.stdout}\n${result.stderr}`;
		if (result.code === 0 && OAL_EVIDENCE_PATTERN.test(output))
			console.log(`${provider}: STATUS PASS live prompt completed`);
		else if (result.code === 0)
			throw new Error(
				`${provider}: STATUS BLOCKED live prompt missed expected evidence. output=${snippet(result.stdout || result.stderr)}`,
			);
		else
			throw new Error(
				`${provider}: STATUS BLOCKED live prompt failed: ${result.stderr.trim() || result.stdout.trim()}`,
			);
	} finally {
		await rm(fixture, { recursive: true, force: true });
		await rm(stateRoot, { recursive: true, force: true });
	}
}

async function runClaudeLivePrompt(repoRoot: string): Promise<void> {
	const fixture = await mkdtemp(join(tmpdir(), "oal-provider-e2e-claude-"));
	try {
		await runDeployCommand(repoRoot, [
			"--target",
			fixture,
			"--provider",
			"claude",
			"--scope",
			"project",
			"--quiet",
		]);
		await runDeployedRuntimeChecks(fixture, "claude");
		const prompt =
			"Report whether OAL Claude config loaded. Do not edit files. Final answer must mention OAL and .claude/settings.json only.";
		const result = await run(
			"claude",
			["-p", prompt, "--output-format", "json"],
			fixture,
		);
		const output = `${result.stdout}\n${result.stderr}`;
		if (result.code === 0 && CLAUDE_EVIDENCE_PATTERN.test(output))
			console.log("claude: STATUS PASS live prompt completed");
		else if (result.code === 0)
			throw new Error(
				`claude: STATUS BLOCKED live prompt missed expected evidence. output=${snippet(result.stdout || result.stderr)}`,
			);
		else
			throw new Error(
				`claude: STATUS BLOCKED live prompt failed: ${result.stderr.trim() || result.stdout.trim()}`,
			);
	} finally {
		await rm(fixture, { recursive: true, force: true });
	}
}

async function runCodexLivePrompt(repoRoot: string): Promise<void> {
	const home = await mkdtemp(join(tmpdir(), "oal-provider-e2e-codex-home-"));
	try {
		await copyCodexAuth(home);
		await runDeployCommand(repoRoot, [
			"--home",
			home,
			"--provider",
			"codex",
			"--scope",
			"global",
			"--skip-bin",
			"--quiet",
		]);
		await writeCodexHookFixtureConfig(home);
		await rm(join(home, ".codex/agents"), { recursive: true, force: true });
		await runDeployedRuntimeChecks(home, "codex");
		const prompt =
			"Use shell exactly once to run this exact command: npx prettier foo.js\nDo not run bunx yourself. Then report the command result. Do not edit files.";
		const result = await run(
			"codex",
			[
				"exec",
				"--cd",
				home,
				"--sandbox",
				"read-only",
				"--skip-git-repo-check",
				"--ephemeral",
				"--json",
				prompt,
			],
			home,
			{ CODEX_HOME: join(home, ".codex") },
		);
		const output = `${result.stdout}\n${result.stderr}`;
		if (result.code === 0 && BUNX_HOOK_PATTERN.test(output))
			console.log("codex: STATUS PASS live prompt triggered Bun hook");
		else if (result.code === 0)
			throw new Error(
				`codex: STATUS BLOCKED live prompt missed expected evidence. output=${snippet(result.stdout || result.stderr)}`,
			);
		else
			throw new Error(
				`codex: STATUS BLOCKED live prompt failed: ${result.stderr.trim() || result.stdout.trim()}`,
			);
	} finally {
		await rm(home, { recursive: true, force: true });
	}
}

async function writeCodexHookFixtureConfig(home: string): Promise<void> {
	await writeFile(
		join(home, ".codex/config.toml"),
		`profile = "oal-hook-e2e"

[features]
hooks = true
codex_hooks = true

[profiles.oal-hook-e2e]
model = "gpt-5.4-mini"
approval_policy = "never"
sandbox_mode = "read-only"
`,
	);
}

async function copyCodexAuth(home: string): Promise<void> {
	const sourceHome = process.env["CODEX_HOME"] ?? join(homedir(), ".codex");
	const targetHome = join(home, ".codex");
	await mkdir(targetHome, { recursive: true });
	await copyFile(join(sourceHome, "auth.json"), join(targetHome, "auth.json"));
	await copyFile(
		join(sourceHome, "installation_id"),
		join(targetHome, "installation_id"),
	).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== "ENOENT") throw error;
	});
}

async function runDeployedRuntimeChecks(
	fixture: string,
	provider: E2eProvider,
): Promise<void> {
	const hookRoot =
		provider === "codex"
			? ".codex/openagentlayer/hooks"
			: provider === "claude"
				? ".claude/hooks/scripts"
				: ".opencode/openagentlayer/hooks";
	const hook = join(fixture, hookRoot, "enforce-rtk-commands.mjs");
	const hookResult = await runWithStdin(
		"bun",
		[hook],
		fixture,
		JSON.stringify({ command: "npx prettier foo.js" }),
		{ OAL_HOOK_RAW_OUTCOME: "1" },
	);
	if (!hookResult.stdout.includes('"decision":"block"'))
		throw new Error(
			`${provider} deployed RTK hook did not block npx: ${hookResult.stderr || hookResult.stdout}`,
		);
	if (!hookResult.stdout.includes("rtk proxy -- bunx prettier foo.js"))
		throw new Error(
			`${provider} deployed RTK hook did not enforce bunx: ${hookResult.stderr || hookResult.stdout}`,
		);
	console.log(`${provider}: deployed hook checks PASS`);
}

function snippet(text: string): string {
	return text.replace(/\s+/g, " ").trim().slice(0, 400) || "<empty>";
}

async function run(
	command: string,
	args: string[],
	cwd: string,
	env: NodeJS.ProcessEnv = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
	let proc: Bun.Subprocess<"ignore", "pipe", "pipe">;
	try {
		proc = Bun.spawn([command, ...args], {
			cwd,
			env: { ...process.env, ...env },
			stdout: "pipe",
			stderr: "pipe",
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { code: 127, stdout: "", stderr: message };
	}
	let timedOut = false;
	const timeout = setTimeout(() => {
		timedOut = true;
		proc.kill();
	}, 120_000);
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	clearTimeout(timeout);
	return {
		code,
		stdout,
		stderr: timedOut ? `${stderr}\ntimed out after 120000ms`.trim() : stderr,
	};
}

async function runWithStdin(
	command: string,
	args: string[],
	cwd: string,
	stdin: string,
	env: NodeJS.ProcessEnv = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn([command, ...args], {
		cwd,
		env: { ...process.env, ...env },
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	proc.stdin.write(stdin);
	proc.stdin.end();
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { code, stdout, stderr };
}
