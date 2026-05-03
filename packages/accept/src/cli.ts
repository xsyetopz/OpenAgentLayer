import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI_ENTRY = "packages/cli/src/main.ts";

export async function assertCliContracts(repoRoot: string): Promise<void> {
	await runCli(repoRoot, ["check"]);
	const rtkGain = await runRtkGainFixture(repoRoot);
	if (!rtkGain.stdout.includes("STATUS PASS"))
		throw new Error("CLI rtk-gain did not report pass status.");
	const toolchain = await runCli(repoRoot, [
		"toolchain",
		"--os",
		"macos",
		"--homebrew-missing",
		"--optional",
		"ctx7,playwright",
	]);
	if (
		!(
			toolchain.stdout.includes("Homebrew/install") &&
			toolchain.stdout.includes("brew install bun ripgrep") &&
			toolchain.stdout.includes("rtk gain") &&
			toolchain.stdout.includes("rtk grep --help") &&
			toolchain.stdout.includes("rtk find --help") &&
			toolchain.stdout.includes("bunx ctx7 setup") &&
			toolchain.stdout.includes(
				"bunx -p playwright playwright install --with-deps",
			) &&
			!toolchain.stdout.includes("- bunx")
		)
	)
		throw new Error(
			"CLI toolchain plan did not include required install steps.",
		);
	const preview = await runCli(repoRoot, ["preview", "--provider", "opencode"]);
	if (
		!(
			preview.stdout.includes("# OpenAgentLayer Generated Artifact Preview") &&
			preview.stdout.includes("## Artifact Tree") &&
			preview.stdout.includes("opencode.jsonc") &&
			preview.stdout.includes(".opencode/tools/")
		)
	)
		throw new Error(
			"CLI preview did not show generated OpenCode artifact set.",
		);
	const contentPreview = await runCli(repoRoot, [
		"preview",
		"--provider",
		"codex",
		"--path",
		".codex/config.toml",
		"--content",
	]);
	if (
		!(
			contentPreview.stdout.includes("## Artifact Contents") &&
			contentPreview.stdout.includes("### codex .codex/config.toml") &&
			contentPreview.stdout.includes('model = "gpt-5.5"')
		)
	)
		throw new Error("CLI preview did not show selected artifact content.");
	for (const provider of ["codex", "claude", "opencode"]) {
		const out = await mkdtemp(join(tmpdir(), `oal-cli-${provider}-`));
		await runCli(repoRoot, ["render", "--provider", provider, "--out", out]);
		await rm(out, { recursive: true, force: true });
	}
	const deployRoot = await mkdtemp(join(tmpdir(), "oal-cli-deploy-"));
	const dryRun = await runCli(repoRoot, [
		"deploy",
		"--target",
		deployRoot,
		"--provider",
		"codex",
		"--scope",
		"project",
		"--dry-run",
	]);
	if (!dryRun.stdout.includes(".codex/config.toml"))
		throw new Error("CLI deploy dry-run did not report Codex config changes.");
	await rm(deployRoot, { recursive: true, force: true });
	const globalRoot = await mkdtemp(join(tmpdir(), "oal-cli-global-"));
	const globalEnv = await fakeProviderPath(globalRoot, [
		"codex",
		"claude",
		"opencode",
	]);
	const globalDryRun = await runCli(
		repoRoot,
		[
			"deploy",
			"--scope",
			"global",
			"--home",
			globalRoot,
			"--provider",
			"all",
			"--dry-run",
		],
		{ env: globalEnv },
	);
	if (
		!(
			globalDryRun.stdout.includes(".codex/AGENTS.md") &&
			globalDryRun.stdout.includes(".claude/CLAUDE.md") &&
			globalDryRun.stdout.includes(".config/opencode/opencode.jsonc")
		)
	)
		throw new Error("CLI global dry-run did not report provider home changes.");
	await rm(globalRoot, { recursive: true, force: true });
	const pluginRoot = await mkdtemp(join(tmpdir(), "oal-cli-plugins-"));
	const pluginEnv = await fakeProviderPath(pluginRoot, [
		"codex",
		"claude",
		"opencode",
	]);
	const pluginDryRun = await runCli(
		repoRoot,
		["plugins", "--home", pluginRoot, "--provider", "all", "--dry-run"],
		{ env: pluginEnv },
	);
	if (
		!(
			pluginDryRun.stdout.includes(".codex-plugin/plugin.json") &&
			pluginDryRun.stdout.includes(
				".claude/plugins/marketplaces/openagentlayer",
			) &&
			pluginDryRun.stdout.includes(".config/opencode/plugins/openagentlayer")
		)
	)
		throw new Error("CLI plugins dry-run did not report provider plugin sync.");
	await rm(pluginRoot, { recursive: true, force: true });
	await assertCliFails(repoRoot, ["render", "--provider", "bogus"], "provider");
	await assertCliFails(repoRoot, ["deploy", "--scope", "workspace"], "scope");
}

async function runRtkGainFixture(
	repoRoot: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
	const fixtureRoot = await mkdtemp(join(tmpdir(), "oal-rtk-gain-"));
	try {
		const fixturePath = join(fixtureRoot, "gain.txt");
		await writeFile(
			fixturePath,
			"Total commands:    1\nTokens saved:      10K (92.9%)\n",
		);
		return await runCli(repoRoot, [
			"rtk-gain",
			"--from-file",
			fixturePath,
			"--allow-empty-history",
		]);
	} finally {
		await rm(fixtureRoot, { recursive: true, force: true });
	}
}

async function assertCliFails(
	repoRoot: string,
	args: string[],
	expected: string,
): Promise<void> {
	const result = await runCli(repoRoot, args, { allowFailure: true });
	if (result.code === 0)
		throw new Error(`CLI command unexpectedly passed: ${args.join(" ")}`);
	if (!`${result.stdout}\n${result.stderr}`.includes(expected))
		throw new Error(
			`CLI failure for ${args.join(" ")} did not mention ${expected}.`,
		);
}

async function runCli(
	repoRoot: string,
	args: string[],
	options: { allowFailure?: boolean; env?: NodeJS.ProcessEnv } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
	const spawnOptions = {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
		...(options.env ? { env: options.env } : {}),
	} as const;
	const command = Bun.spawn(["bun", CLI_ENTRY, ...args], spawnOptions);
	const [stdout, stderr, code] = await Promise.all([
		new Response(command.stdout).text(),
		new Response(command.stderr).text(),
		command.exited,
	]);
	if (!options.allowFailure && code !== 0)
		throw new Error(
			`CLI command failed (${args.join(" ")}):\n${stdout}\n${stderr}`,
		);
	return { code, stdout, stderr };
}

async function fakeProviderPath(
	root: string,
	providers: string[],
): Promise<NodeJS.ProcessEnv> {
	const bin = join(root, "provider-bin");
	await mkdir(bin, { recursive: true });
	for (const provider of providers) {
		const path = join(bin, provider);
		await writeFile(path, "#!/usr/bin/env sh\nexit 0\n");
		await chmod(path, 0o755);
	}
	return { ...process.env, PATH: `${bin}:${process.env["PATH"] ?? ""}` };
}
