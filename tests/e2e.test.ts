import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "..");

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
	await expect(
		readFile(join(root, ".codex/config.toml"), "utf8"),
	).rejects.toThrow();
	await rm(root, { recursive: true, force: true });
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
			"ctx7,playwright",
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = await new Response(command.stdout).text();
	expect(await command.exited).toBe(0);
	expect(stdout).toContain("sudo apt-get update");
	expect(stdout).toContain("sudo apt-get install -y bun ripgrep");
	expect(stdout).toContain("rtk gain");
	expect(stdout).toContain("rtk grep --help");
	expect(stdout).toContain("rtk find --help");
	expect(stdout).toContain("bunx ctx7 setup --cli --universal");
	expect(stdout).toContain("bunx playwright install --with-deps");
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

test("CLI plugins dry-run reports provider plugin payloads without writing", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-plugins-e2e-"));
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
		],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
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
