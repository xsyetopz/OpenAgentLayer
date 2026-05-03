import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import {
	chmod,
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "..");

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

function tomlSection(content: string, section: string): string {
	const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return (
		content.match(
			new RegExp(`\\[${escapedSection}\\]([\\s\\S]*?)(?=\\n\\[|$)`),
		)?.[1] ?? ""
	);
}

test("CLI dry-run reports Codex and OpenCode changes without writing", async () => {
	for (const provider of ["codex", "opencode"]) {
		const root = await mkdtemp(join(tmpdir(), `oal-e2e-${provider}-`));
		const command = Bun.spawn(
			[
				"bun",
				"packages/cli/src/main.ts",
				"deploy",
				"--target",
				root,
				"--provider",
				provider,
				"--dry-run",
				"--verbose",
			],
			{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
		);
		const stdout = await new Response(command.stdout).text();
		const stderr = await new Response(command.stderr).text();
		expect(await command.exited).toBe(0);
		expect(stderr).toBe("");
		expect(stdout).toContain(
			provider === "codex" ? ".codex/config.toml" : "opencode.jsonc",
		);
		await expect(
			readFile(join(root, ".oal/manifest/codex.json"), "utf8"),
		).rejects.toThrow();
		await rm(root, { recursive: true, force: true });
	}
});

test("CLI help is Commander-backed and non-interactive-safe", async () => {
	const command = Bun.spawn(["bun", "packages/cli/src/main.ts"], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("Usage: oal [options] [command]");
	expect(stdout).toContain("interactive");
	expect(stdout).toContain("deploy [options]");
	expect(stdout).toContain("setup [options]");
	expect(stdout).not.toContain("generate [options]");
});

test("CLI help command exits cleanly without Commander stack traces", async () => {
	for (const args of [["help"], ["--help"]]) {
		const command = Bun.spawn(["bun", "packages/cli/src/main.ts", ...args], {
			cwd: repoRoot,
			stdout: "pipe",
			stderr: "pipe",
		});
		const stdout = await new Response(command.stdout).text();
		const stderr = await new Response(command.stderr).text();
		expect(await command.exited).toBe(0);
		expect(stdout).toContain("Usage: oal [options] [command]");
		expect(stderr).not.toContain("CommanderError");
		expect(stderr).not.toContain("command.js");
	}
});

test("CLI expected errors exit cleanly without Commander stack traces", async () => {
	for (const [args, expected] of [
		[["uninstall"], "required option '--provider <provider>' not specified"],
		[["nope"], "unknown command 'nope'"],
	] as const) {
		const command = Bun.spawn(["bun", "packages/cli/src/main.ts", ...args], {
			cwd: repoRoot,
			stdout: "pipe",
			stderr: "pipe",
		});
		const stderr = await new Response(command.stderr).text();
		expect(await command.exited).toBe(1);
		expect(stderr).toContain(expected);
		expect(stderr).not.toContain("CommanderError");
		expect(stderr).not.toContain("command.js");
	}
});

test("CLI check uses concise output and verbose internals", async () => {
	const concise = Bun.spawn(["bun", "packages/cli/src/main.ts", "check"], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const conciseStdout = await new Response(concise.stdout).text();
	const conciseStderr = await new Response(concise.stderr).text();
	expect(await concise.exited).toBe(0);
	expect(conciseStderr).toBe("");
	expect(conciseStdout).toContain("◇ Load OAL source");
	expect(conciseStdout).toContain("└ ✓ OAL source and render checks passed");
	expect(conciseStdout).not.toContain("artifacts:");
	const verbose = Bun.spawn(
		["bun", "packages/cli/src/main.ts", "check", "--verbose"],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const verboseStdout = await new Response(verbose.stdout).text();
	const verboseStderr = await new Response(verbose.stderr).text();
	expect(await verbose.exited).toBe(0);
	expect(verboseStderr).toBe("");
	expect(verboseStdout).toContain("providers: codex, claude, opencode");
	expect(verboseStdout).toContain("artifacts:");
	expect(verboseStdout).toContain("unsupported capabilities:");
});

test("CLI global dry-run maps provider artifacts into global homes", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-global-e2e-"));
	const env = await fakeProviderPath(home, ["codex", "claude", "opencode"]);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"deploy",
			"--scope",
			"global",
			"--home",
			home,
			"--provider",
			"all",
			"--dry-run",
			"--verbose",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain(".codex/config.toml");
	expect(stdout).toContain(".claude/settings.json");
	expect(stdout).toContain(".config/opencode/opencode.jsonc");
	expect(stdout).toContain(".codex/AGENTS.md");
	expect(stdout).toContain(".claude/CLAUDE.md");
	expect(stdout).toContain("OpenAgentLayer deploy · dry-run");
	expect(stdout).toContain("binary:");
	await expect(
		readFile(join(home, ".openagentlayer/manifest/global/codex.json"), "utf8"),
	).rejects.toThrow();
	await rm(home, { recursive: true, force: true });
});

test("CLI global deploy installs usable oal shim", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-global-bin-e2e-"));
	const env = await fakeProviderPath(home, ["codex"]);
	const binDir = join(home, "bin");
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"deploy",
			"--scope",
			"global",
			"--home",
			home,
			"--bin-dir",
			binDir,
			"--provider",
			"codex",
			"--quiet",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	const shim = join(binDir, "oal");
	expect(await readFile(shim, "utf8")).toContain("packages/cli/src/main.ts");
	const check = Bun.spawn([shim, "check"], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = await new Response(check.stdout).text();
	const checkStderr = await new Response(check.stderr).text();
	expect(await check.exited).toBe(0);
	expect(checkStderr).toBe("");
	expect(stdout).toContain("OAL source and render checks passed");
	await rm(home, { recursive: true, force: true });
});

test("CLI global deploy can skip oal shim", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-global-no-bin-e2e-"));
	const env = await fakeProviderPath(home, ["codex"]);
	const binDir = join(home, "bin");
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"deploy",
			"--scope",
			"global",
			"--home",
			home,
			"--bin-dir",
			binDir,
			"--provider",
			"codex",
			"--skip-bin",
			"--dry-run",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).not.toContain("binary:");
	await expect(readFile(join(binDir, "oal"), "utf8")).rejects.toThrow();
	await rm(home, { recursive: true, force: true });
});

test("CLI global deploy skips missing provider binaries without failing", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-global-missing-provider-"));
	const env = await fakeProviderPath(home, ["codex"]);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"deploy",
			"--scope",
			"global",
			"--home",
			home,
			"--provider",
			"codex,claude",
			"--dry-run",
			"--verbose",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain(".codex/config.toml");
	expect(stdout).toContain("skip claude");
	expect(stdout).not.toContain(".claude/settings.json");
	await rm(home, { recursive: true, force: true });
});

test("CLI preview shows generated artifact set without writing files", async () => {
	const root = await mkdtemp(join(tmpdir(), "oal-preview-"));
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"codex",
			"--path",
			".codex/config.toml",
			"--content",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("# OpenAgentLayer Generated Artifact Preview");
	expect(stdout).toContain(".codex/config.toml");
	expect(stdout).toContain("source: config:codex");
	expect(stdout).toContain("## Artifact Contents");
	expect(stdout).toContain('model = "gpt-5.5"');
	expect(stdout).toContain("interrupt_message = true");
	expect(stdout).not.toContain('interrupt_message = "');
	await expect(
		readFile(join(root, ".codex/config.toml"), "utf8"),
	).rejects.toThrow();
	await rm(root, { recursive: true, force: true });
});

test("CLI preview accepts comma-separated providers", async () => {
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"codex,opencode",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain(".codex/config.toml");
	expect(stdout).toContain("opencode.jsonc");
	expect(stdout).not.toContain(".claude/settings.json");
});

test("CLI render accepts comma-separated providers", async () => {
	const out = await mkdtemp(join(tmpdir(), "oal-render-multi-"));
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"render",
			"--provider",
			"codex,opencode",
			"--out",
			out,
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("codex,opencode");
	expect(await readFile(join(out, ".codex/config.toml"), "utf8")).toContain(
		"model",
	);
	expect(await readFile(join(out, "opencode.jsonc"), "utf8")).toContain(
		"openagentlayer",
	);
	await expect(
		readFile(join(out, ".claude/settings.json"), "utf8"),
	).rejects.toThrow();
	await rm(out, { recursive: true, force: true });
});

test("CLI preview applies subscription model plans", async () => {
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"codex",
			"--plan",
			"pro-20",
			"--path",
			".codex/agents/athena.toml",
			"--content",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain('model = "gpt-5.5"');
	expect(stdout).toContain('model_reasoning_effort = "high"');
	expect(stdout).toContain("developer_instructions =");
	expect(stdout).not.toContain("color =");
});

test("CLI preview routes OpenCode detected models and free fallbacks", async () => {
	const root = await mkdtemp(join(tmpdir(), "oal-opencode-models-"));
	const modelsFile = join(root, "models.txt");
	await writeFile(
		modelsFile,
		[
			"opencode/gpt-5.5",
			"opencode/gpt-5.3-codex",
			"opencode/gpt-5.3-codex-spark",
			"opencode/claude-opus-4-7",
		].join("\n"),
	);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"opencode",
			"--plan",
			"opencode-auto",
			"--opencode-models-file",
			modelsFile,
			"--path",
			"opencode.jsonc",
			"--content",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain('"model": "opencode/gpt-5.5"');
	expect(stdout).toContain('"model": "opencode/gpt-5.3-codex"');
	expect(stdout).toContain("opencode/gpt-5-nano");
	expect(stdout).not.toContain("opencode/gpt-5.3-codex-spark");
	expect(stdout).not.toContain("opencode/claude-opus-4-7");
	await rm(root, { recursive: true, force: true });
});

test("CLI preview applies configurable Caveman mode", async () => {
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"codex",
			"--caveman-mode",
			"off",
			"--path",
			"AGENTS.md",
			"--content",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("Caveman mode: off");
	expect(stdout).not.toContain("Caveman mode: lite");
});

test("CLI rejects unsupported Caveman mode cleanly", async () => {
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"codex",
			"--caveman-mode",
			"yell",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(1);
	expect(stderr).toContain("Unsupported caveman mode yell");
});

test("CLI preview applies Codex subscription plan to profile reasoning", async () => {
	const pro5 = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"codex",
			"--codex-plan",
			"pro-5",
			"--path",
			".codex/config.toml",
			"--content",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const pro5Stdout = await new Response(pro5.stdout).text();
	expect(await pro5.exited).toBe(0);
	const pro5Lead = tomlSection(pro5Stdout, "profiles.openagentlayer");
	const pro5Implement = tomlSection(
		pro5Stdout,
		"profiles.openagentlayer-implement",
	);
	expect(pro5Lead).toContain('plan_mode_reasoning_effort = "high"');
	expect(pro5Lead).toContain('model_reasoning_effort = "medium"');
	expect(pro5Lead).toContain('model_verbosity = "low"');
	expect(pro5Implement).toContain('plan_mode_reasoning_effort = "medium"');
	expect(pro5Implement).toContain('model_reasoning_effort = "high"');
	expect(pro5Stdout).toContain("hide_rate_limit_model_nudge = true");
	const pro20 = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"codex",
			"--codex-plan",
			"pro-20",
			"--path",
			".codex/config.toml",
			"--content",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const pro20Stdout = await new Response(pro20.stdout).text();
	expect(await pro20.exited).toBe(0);
	const pro20Lead = tomlSection(pro20Stdout, "profiles.openagentlayer");
	const pro20Implement = tomlSection(
		pro20Stdout,
		"profiles.openagentlayer-implement",
	);
	expect(pro20Lead).toContain('plan_mode_reasoning_effort = "high"');
	expect(pro20Lead).toContain('model_reasoning_effort = "medium"');
	expect(pro20Lead).toContain('model_verbosity = "low"');
	expect(pro20Implement).toContain('plan_mode_reasoning_effort = "medium"');
	expect(pro20Implement).toContain('model_reasoning_effort = "high"');
	expect(pro20Stdout).toContain("hide_rate_limit_model_nudge = true");
});

test("CLI setup dry-run plans deploy plugins tools and checks", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-setup-e2e-"));
	const env = await fakeProviderPath(home, ["codex", "opencode"]);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"setup",
			"--scope",
			"global",
			"--home",
			home,
			"--provider",
			"all",
			"--codex-plan",
			"pro-20",
			"--opencode-plan",
			"opencode-free",
			"--optional",
			"ctx7,playwright,deepwiki",
			"--rtk",
			"--dry-run",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("OpenAgentLayer setup · dry-run");
	expect(stdout).toContain("providers: codex, opencode");
	expect(stdout).toContain("skip claude");
	expect(stdout).toContain("rtk init -g --codex");
	expect(stdout).toContain("bunx ctx7 setup --cli --yes --codex --opencode");
	expect(stdout).toContain("bunx -p playwright playwright install --with-deps");
	expect(stdout).toContain("claude mcp add oal-deepwiki-docs");
	expect(stdout).toContain("OpenAgentLayer deploy · dry-run");
	expect(stdout).toContain("OpenAgentLayer plugins · dry-run");
	expect(stdout).toContain("Validate source and installed state");
	await rm(home, { recursive: true, force: true });
});

test("CLI setup apply activates Codex profile and $oal plugin", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-setup-apply-codex-"));
	const env = await fakeProviderPath(home, ["codex"]);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"setup",
			"--scope",
			"global",
			"--home",
			home,
			"--provider",
			"codex",
			"--codex-plan",
			"pro-20",
			"--quiet",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	const config = await readFile(join(home, ".codex/config.toml"), "utf8");
	expect(config).toContain('profile = "openagentlayer"');
	expect(config).toContain('plan_mode_reasoning_effort = "high"');
	expect(config).toContain('model_reasoning_effort = "high"');
	expect(config).toContain('[plugins."oal@openagentlayer-local"]');
	expect(
		await readFile(
			join(home, ".codex/plugins/openagentlayer/.codex-plugin/plugin.json"),
			"utf8",
		),
	).toContain('"name": "oal"');
	const [version] = await readdir(
		join(home, ".codex/plugins/cache/openagentlayer-local/oal"),
	);
	expect(version).toBeTruthy();
	expect(
		await readFile(
			join(
				home,
				".codex/plugins/cache/openagentlayer-local/oal",
				version,
				".codex-plugin/plugin.json",
			),
			"utf8",
		),
	).toContain('"name": "oal"');
	await rm(home, { recursive: true, force: true });
});

test("CLI Codex agent artifacts omit unsupported color fields", async () => {
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"preview",
			"--provider",
			"codex",
			"--path",
			".codex/agents/athena.toml",
			"--content",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain('model = "gpt-5.5"');
	expect(stdout).not.toContain("color =");
});

test("CLI toolchain shows OS package-manager install plan", async () => {
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"toolchain",
			"--os",
			"linux",
			"--pkg",
			"apt",
			"--optional",
			"ctx7,playwright,anthropic-docs,opencode-docs",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	expect(await command.exited).toBe(0);
	expect(stdout).toContain("sudo apt-get update");
	expect(stdout).toContain("sudo apt-get install -y bun ripgrep");
	expect(stdout).toContain("rtk gain");
	expect(stdout).toContain("rtk init -g --codex");
	expect(stdout).toContain("rtk init -g --opencode");
	expect(stdout).toContain("rtk grep --help");
	expect(stdout).toContain("rtk find --help");
	expect(stdout).toContain(
		"bunx ctx7 setup --cli --yes --codex --claude --opencode",
	);
	expect(stdout).toContain("bunx -p playwright playwright install --with-deps");
	expect(stdout).toContain("claude mcp add oal-anthropic-docs");
	expect(stdout).toContain("opencode mcp add oal-opencode-docs");
	expect(stdout).not.toContain("\n- bunx");
});

test("CLI features shows optional install and removal commands", async () => {
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"features",
			"--install",
			"ctx7,playwright,anthropic-docs,opencode-docs",
			"--remove",
			"playwright",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain(
		"bunx ctx7 setup --cli --yes --codex --claude --opencode",
	);
	expect(stdout).toContain("bunx -p playwright playwright install --with-deps");
	expect(stdout).toContain("claude mcp add oal-anthropic-docs");
	expect(stdout).toContain("opencode mcp add oal-opencode-docs");
	expect(stdout).toContain("bunx -p playwright playwright uninstall --all");
});

test("CLI RTK gain check reports status", async () => {
	const root = await mkdtemp(join(tmpdir(), "oal-rtk-gain-"));
	const fixture = join(root, "gain.txt");
	await writeFile(
		fixture,
		"Total commands:    1\nTokens saved:      10K (92.9%)\n",
	);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"rtk-gain",
			"--from-file",
			fixture,
			"--allow-empty-history",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("STATUS PASS");
	await rm(root, { recursive: true, force: true });
});

test("CLI RTK report groups project history by routing kind", async () => {
	const root = await mkdtemp(join(tmpdir(), "oal-rtk-report-"));
	const dbPath = join(root, "history.db");
	const db = new Database(dbPath);
	db.run(`create table commands (
		id integer primary key,
		timestamp text not null,
		original_cmd text not null,
		rtk_cmd text not null,
		input_tokens integer not null,
		output_tokens integer not null,
		saved_tokens integer not null,
		savings_pct real not null,
		exec_time_ms integer default 0,
		project_path text default ''
	)`);
	const insert = db.query(
		"insert into commands (timestamp, original_cmd, rtk_cmd, input_tokens, output_tokens, saved_tokens, savings_pct, exec_time_ms, project_path) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
	);
	insert.run("2026-05-03", "grep foo", "rtk grep", 100, 20, 80, 80, 100, root);
	insert.run(
		"2026-05-03",
		"nl -ba file",
		"rtk proxy nl -ba file",
		100,
		100,
		0,
		0,
		200,
		root,
	);
	insert.run("2026-05-03", "sort", "rtk fallback: sort", 0, 0, 0, 0, 300, root);
	db.close();
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"rtk-report",
			"--project",
			root,
			"--db",
			dbPath,
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("proxy: commands=1");
	expect(stdout).toContain("filtered: commands=1");
	expect(stdout).toContain("fallback: commands=1");
	expect(stdout).toContain("nl -ba <file>");
	await rm(root, { recursive: true, force: true });
});

test("CLI plugins dry-run reports provider plugin payloads without writing", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-plugins-e2e-"));
	const env = await fakeProviderPath(home, ["codex", "claude", "opencode"]);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"plugins",
			"--home",
			home,
			"--provider",
			"all",
			"--dry-run",
			"--verbose",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain(".codex-plugin/plugin.json");
	expect(stdout).toContain(".claude/plugins/marketplaces/openagentlayer");
	expect(stdout).toContain(".config/opencode/plugins/openagentlayer");
	await expect(
		readFile(
			join(home, ".codex/plugins/openagentlayer/.codex-plugin/plugin.json"),
			"utf8",
		),
	).rejects.toThrow();
	await rm(home, { recursive: true, force: true });
});

test("CLI plugins accepts comma-separated providers", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-plugins-multi-e2e-"));
	const env = await fakeProviderPath(home, ["codex", "opencode"]);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"plugins",
			"--home",
			home,
			"--provider",
			"codex,opencode",
			"--dry-run",
			"--verbose",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain(".codex-plugin/plugin.json");
	expect(stdout).toContain(".config/opencode/plugins/openagentlayer");
	expect(stdout).not.toContain(".claude/plugins/marketplaces/openagentlayer");
	await rm(home, { recursive: true, force: true });
});

test("CLI plugins skips missing provider binaries without failing", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-plugins-missing-e2e-"));
	const env = await fakeProviderPath(home, ["codex"]);
	const command = Bun.spawn(
		[
			"bun",
			"packages/cli/src/main.ts",
			"plugins",
			"--home",
			home,
			"--provider",
			"codex,claude",
			"--dry-run",
			"--verbose",
		],
		{ cwd: repoRoot, env, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	const stderr = await new Response(command.stderr).text();
	expect(await command.exited).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain(".codex-plugin/plugin.json");
	expect(stdout).toContain("skip claude");
	expect(stdout).toContain("claude binary not found in PATH");
	expect(stdout).not.toContain(".claude/plugins/marketplaces/openagentlayer");
	await rm(home, { recursive: true, force: true });
});
