import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI_ENTRY = "packages/cli/src/main.ts";

export async function assertInstalledFlowSmoke(
	repoRoot: string,
): Promise<void> {
	const root = await mkdtemp(join(tmpdir(), "oal-installed-smoke-"));
	try {
		const home = join(root, "home");
		const project = join(root, "project");
		const binDir = join(root, "bin");
		await mkdir(project, { recursive: true });
		const env = await fakeProviderPath(root, ["codex", "claude", "opencode"]);
		await runCli(
			repoRoot,
			[
				"setup",
				"--scope",
				"global",
				"--home",
				home,
				"--bin-dir",
				binDir,
				"--provider",
				"all",
				"--quiet",
			],
			{ env },
		);
		const shim = join(binDir, "oal");
		const opendexShim = join(binDir, "opendex");
		const check = await runBinary(repoRoot, shim, ["check", "--verbose"], {
			env,
		});
		if (
			!(
				check.stdout.includes("OAL source and render checks passed") &&
				check.stdout.includes("artifacts:")
			)
		)
			throw new Error("Installed oal check did not report verbose success");
		const globalCodexConfig = await readFile(
			join(home, ".codex/config.toml"),
			"utf8",
		);
		if (!globalCodexConfig.includes("interrupt_message = true"))
			throw new Error(
				"Global Codex config did not preserve boolean agents.interrupt_message.",
			);
		const preview = await runBinary(
			repoRoot,
			shim,
			[
				"preview",
				"--provider",
				"codex",
				"--path",
				".codex/config.toml",
				"--content",
			],
			{ env },
		);
		if (!preview.stdout.includes("interrupt_message = true"))
			throw new Error(
				"Installed oal preview did not render Codex config content.",
			);
		const opendex = await runBinary(
			repoRoot,
			opendexShim,
			["--dry-run", "--version"],
			{ env },
		);
		if (!opendex.stdout.includes("opendex"))
			throw new Error("Installed opendex shim did not route to OpenDex");
		await runBinary(
			repoRoot,
			shim,
			[
				"deploy",
				"--target",
				project,
				"--scope",
				"project",
				"--provider",
				"all",
				"--quiet",
			],
			{ env },
		);
		await assertProjectArtifacts(project);
		await runBinary(
			repoRoot,
			shim,
			[
				"uninstall",
				"--target",
				project,
				"--scope",
				"project",
				"--provider",
				"codex",
				"--quiet",
			],
			{ env },
		);
		try {
			await readFile(join(project, ".codex/config.toml"), "utf8");
			throw new Error("Project Codex config remained after owned uninstall");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

async function assertProjectArtifacts(project: string): Promise<void> {
	const codex = await readFile(join(project, ".codex/config.toml"), "utf8");
	if (!codex.includes("interrupt_message = true"))
		throw new Error(
			"Project Codex config did not include boolean interrupt message.",
		);
	JSON.parse(await readFile(join(project, ".claude/settings.json"), "utf8"));
	const opencode = await readFile(join(project, "opencode.jsonc"), "utf8");
	if (!opencode.includes("openagentlayer"))
		throw new Error("Project OpenCode config was not installed");
}

async function fakeProviderPath(
	root: string,
	providers: string[],
): Promise<NodeJS.ProcessEnv> {
	const providerBin = join(root, "provider-bin");
	await mkdir(providerBin, { recursive: true });
	for (const provider of providers) {
		const path = join(providerBin, provider);
		await writeFile(path, "#!/usr/bin/env sh\nexit 0\n");
		await chmod(path, 0o755);
	}
	return {
		...process.env,
		PATH: `${providerBin}:${process.env["PATH"] ?? ""}`,
	};
}

function runCli(
	repoRoot: string,
	args: string[],
	options: { env?: NodeJS.ProcessEnv } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
	return runBinary(repoRoot, "bun", [CLI_ENTRY, ...args], options);
}

async function runBinary(
	repoRoot: string,
	binary: string,
	args: string[],
	options: { env?: NodeJS.ProcessEnv } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
	const command = Bun.spawn([binary, ...args], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
		...(options.env ? { env: options.env } : {}),
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(command.stdout).text(),
		new Response(command.stderr).text(),
		command.exited,
	]);
	if (code !== 0)
		throw new Error(
			`Installed smoke command failed (${binary} ${args.join(" ")}):\n${stdout}\n${stderr}`,
		);
	return { stdout, stderr, code };
}
