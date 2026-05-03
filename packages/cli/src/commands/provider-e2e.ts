import {
	chmod,
	copyFile,
	mkdir,
	mkdtemp,
	rm,
	writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { flag, option, providerOptions } from "../arguments";
import { expandProviders } from "../provider-binaries";
import { runDeployCommand } from "./deploy";

type E2eProvider = "codex" | "opencode";

const OAL_EVIDENCE_PATTERN = /OAL|OpenAgentLayer|\.codex|\.opencode/i;
const BUNX_HOOK_PATTERN = /rtk proxy -- bunx prettier foo\.js/;

export async function runProviderE2eCommand(
	repoRoot: string,
	args: string[] = [],
): Promise<void> {
	const requested = expandProviders(
		providerOptions(option(args, "--provider") ?? "all"),
	).filter(
		(provider): provider is E2eProvider =>
			provider === "codex" || provider === "opencode",
	);
	const live = flag(args, "--live");
	console.log("# OAL Provider E2E");
	for (const provider of requested) {
		await printVersion(provider);
		if (provider === "opencode") await printOpenCodeModels();
		if (live) await runLivePrompt(repoRoot, provider);
		else
			console.log(
				`${provider}: STATUS BLOCKED live prompt not run; pass --live to spend provider tokens and test hooks/shims.`,
			);
	}
}

async function printVersion(provider: E2eProvider): Promise<void> {
	const result = await run(
		provider,
		provider === "codex" ? ["--version"] : ["--version"],
		process.cwd(),
	);
	if (result.code !== 0)
		throw new Error(`${provider} binary check failed: ${result.stderr}`);
	console.log(`${provider}: version ${result.stdout.trim()}`);
}

async function printOpenCodeModels(): Promise<void> {
	const result = await run("opencode", ["models"], process.cwd());
	if (result.code === 0) {
		console.log("opencode: models OK");
		return;
	}
	console.log(
		`opencode: STATUS BLOCKED model/auth check failed: ${result.stderr.trim() || result.stdout.trim()}`,
	);
}

async function runLivePrompt(
	repoRoot: string,
	provider: E2eProvider,
): Promise<void> {
	if (provider === "codex") {
		await runCodexLivePrompt(repoRoot);
		return;
	}
	const fixture = await mkdtemp(
		join(tmpdir(), `oal-provider-e2e-${provider}-`),
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
zsh_path = ${JSON.stringify(join(home, ".codex/openagentlayer/shim/oal-zsh"))}
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
			: ".opencode/openagentlayer/hooks";
	const hook = join(fixture, hookRoot, "enforce-rtk-commands.mjs");
	const hookResult = await runWithStdin(
		"bun",
		[hook],
		fixture,
		JSON.stringify({ command: "npx prettier foo.js" }),
	);
	if (!hookResult.stdout.includes('"decision":"block"'))
		throw new Error(
			`${provider} deployed RTK hook did not block npx: ${hookResult.stderr || hookResult.stdout}`,
		);
	if (!hookResult.stdout.includes("rtk proxy -- bunx prettier foo.js"))
		throw new Error(
			`${provider} deployed RTK hook did not enforce bunx: ${hookResult.stderr || hookResult.stdout}`,
		);
	if (provider === "codex") await runCodexShimCheck(fixture);
	console.log(`${provider}: deployed hook/shim checks PASS`);
}

async function runCodexShimCheck(fixture: string): Promise<void> {
	const bin = join(fixture, "fake-bin");
	await mkdir(bin, { recursive: true });
	const rtk = join(bin, "rtk");
	await writeFile(rtk, "#!/usr/bin/env sh\nprintf '%s\\n' \"$@\"\n", {
		mode: 0o755,
	});
	await chmod(rtk, 0o755);
	const shim = join(fixture, ".codex/openagentlayer/shim/cargo");
	const proc = Bun.spawn([shim, "check"], {
		cwd: fixture,
		env: {
			...process.env,
			PATH: `${join(fixture, ".codex/openagentlayer/shim")}:${bin}:${process.env["PATH"] ?? ""}`,
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0 || !stdout.includes("cargo\ncheck"))
		throw new Error(
			`Codex cargo shim did not route through RTK: ${stderr || stdout}`,
		);
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
	const proc = Bun.spawn([command, ...args], {
		cwd,
		env: { ...process.env, ...env },
		stdout: "pipe",
		stderr: "pipe",
	});
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
): Promise<{ code: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn([command, ...args], {
		cwd,
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
