import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFixtureRoot } from "@openagentlayer/testkit";

describe("OAL CLI installer", () => {
	test("help uses OAL CLI namespace", async () => {
		const result = await runCli(["help"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: oal ");
	});

	test("doctor verifies source and rendered hook scripts", async () => {
		const result = await runCli(["doctor", "--root", process.cwd()]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("oal doctor ok:");
	});

	test("dry-run render reports write plan without writing files", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await runCli([
			"render",
			"--dry-run",
			"--out",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("add\tmanifest.json");
		expect(await Bun.file(join(targetRoot, "manifest.json")).exists()).toBe(
			false,
		);
	});

	test("render writes generated output without dry-run", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await runCli([
			"render",
			"--out",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(0);
		expect(await Bun.file(join(targetRoot, "manifest.json")).exists()).toBe(
			true,
		);
		expect(await Bun.file(join(targetRoot, "graph.json")).exists()).toBe(true);
	});

	test("render fails before writing when adapter diagnostics contain errors", async () => {
		const sourceRoot = await createFixtureRoot();
		const targetRoot = await createFixtureRoot();
		await writeSurfaceConfig(sourceRoot, "codex");
		await writeSurfaceConfig(sourceRoot, "claude");
		await writeSurfaceConfig(sourceRoot, "opencode", {
			blockedKeyPaths: ["plugin"],
			projectDefaults: [
				"[project_defaults]",
				'plugin = [".opencode/plugins/openagentlayer.ts"]',
			],
		});

		const result = await runCli([
			"render",
			"--out",
			targetRoot,
			"--root",
			sourceRoot,
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(await Bun.file(join(targetRoot, "manifest.json")).exists()).toBe(
			false,
		);
	});

	test("surface all project install and uninstall manage three manifests", async () => {
		const targetRoot = await createFixtureRoot();

		const installResult = await runCli([
			"install",
			"--surface",
			"all",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(installResult.exitCode).toBe(0);
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(true);
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/claude-project.json"),
			).exists(),
		).toBe(true);
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/opencode-project.json"),
			).exists(),
		).toBe(true);

		const uninstallResult = await runCli([
			"uninstall",
			"--surface",
			"all",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(uninstallResult.exitCode).toBe(0);
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/claude-project.json"),
			).exists(),
		).toBe(false);
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/opencode-project.json"),
			).exists(),
		).toBe(false);
	});

	test("doctor verifies installed managed files", async () => {
		const targetRoot = await createFixtureRoot();
		const installResult = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);
		expect(installResult.exitCode).toBe(0);

		const doctorResult = await runCli([
			"doctor",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(doctorResult.exitCode).toBe(0);
		expect(doctorResult.stdout).toContain(
			"oal doctor install codex/project ok",
		);
	});

	test("doctor reports bad installed managed files", async () => {
		const targetRoot = await createFixtureRoot();
		const installResult = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);
		expect(installResult.exitCode).toBe(0);
		await writeFile(join(targetRoot, ".codex/config.toml"), "changed\n");

		const doctorResult = await runCli([
			"doctor",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(doctorResult.exitCode).toBe(1);
		expect(doctorResult.stderr).toContain("hash-mismatch");
	});

	test("global install requires explicit target", async () => {
		const result = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"global",
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain(
			"Global install requires explicit --target",
		);
	});

	test("global install writes selected surface artifacts and manifest", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"global",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(0);
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-global.json"),
			).exists(),
		).toBe(true);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(true);
	});

	test("install fails before writing when adapter diagnostics contain errors", async () => {
		const sourceRoot = await createFixtureRoot();
		const targetRoot = await createFixtureRoot();
		await writeSurfaceConfig(sourceRoot, "codex", {
			blockedKeyPaths: ["features.fast_mode"],
			projectDefaults: ["[project_defaults.features]", "fast_mode = false"],
		});
		await writeSurfaceConfig(sourceRoot, "claude");
		await writeSurfaceConfig(sourceRoot, "opencode");

		const result = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			sourceRoot,
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
	});

	test("install reports config conflicts without partial writes", async () => {
		const targetRoot = await createFixtureRoot();
		await mkdir(join(targetRoot, ".codex"), { recursive: true });
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		const result = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("config-conflict");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
	});

	test("uninstall reports edited managed config and keeps manifest", async () => {
		const targetRoot = await createFixtureRoot();
		const installResult = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);
		expect(installResult.exitCode).toBe(0);
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		const uninstallResult = await runCli([
			"uninstall",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
		]);

		expect(uninstallResult.exitCode).toBe(1);
		expect(uninstallResult.stderr).toContain("managed-content-changed");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(true);
	});

	test("surface all install fails atomically when one adapter has diagnostics", async () => {
		const sourceRoot = await createFixtureRoot();
		const targetRoot = await createFixtureRoot();
		await writeSurfaceConfig(sourceRoot, "codex");
		await writeSurfaceConfig(sourceRoot, "claude");
		await writeSurfaceConfig(sourceRoot, "opencode", {
			blockedKeyPaths: ["plugin"],
			projectDefaults: [
				"[project_defaults]",
				'plugin = [".opencode/plugins/openagentlayer.ts"]',
			],
		});

		const result = await runCli([
			"install",
			"--surface",
			"all",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			sourceRoot,
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(false);
	});

	test("surface all install preflights config conflicts before writing", async () => {
		const targetRoot = await createFixtureRoot();
		await mkdir(join(targetRoot, ".claude"), { recursive: true });
		await writeFile(
			join(targetRoot, ".claude/settings.json"),
			'{"hooks":{"UserPromptSubmit":[]}}\n',
		);

		const result = await runCli([
			"install",
			"--surface",
			"all",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("config-conflict");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(false);
	});
});

async function runCli(args: readonly string[]): Promise<{
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}> {
	const process = Bun.spawn(["bun", "packages/cli/src/cli.ts", ...args], {
		stderr: "pipe",
		stdout: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]);
	return { exitCode, stdout, stderr };
}

async function writeSurfaceConfig(
	root: string,
	surface: "codex" | "claude" | "opencode",
	options: {
		readonly blockedKeyPaths?: readonly string[];
		readonly projectDefaults?: readonly string[];
	} = {},
): Promise<void> {
	const directory = join(root, "source", "surface-configs", surface);
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "surface-config.toml"),
		[
			`id = "${surface}-surface-config"`,
			'kind = "surface-config"',
			`title = "${surface} Surface Config"`,
			`description = "${surface} fixture surface config."`,
			`surface = "${surface}"`,
			`surfaces = ["${surface}"]`,
			'allowed_key_paths = ["agent", "agent.*.*", "agents.max_depth", "agents.max_threads", "command", "command.*.*", "default_agent", "features.fast_mode", "features.multi_agent", "features.multi_agent_v2", "hooks", "hooks.*.hooks.command", "hooks.*.hooks.statusMessage", "hooks.*.hooks.timeout", "hooks.*.hooks.type", "hooks.*.matcher", "permission.skill", "plugin", "profiles.*.*"]',
			`do_not_emit_key_paths = ${JSON.stringify(options.blockedKeyPaths ?? [])}`,
			"validation_rules = []",
			"",
			...(options.projectDefaults ?? ["[project_defaults]"]),
			"",
			"[default_profile]",
			'profile_id = "fixture"',
			'placement = "generated-project-profile"',
			"emitted_key_paths = []",
			'source_url = "fixture"',
			'validation = "fixture"',
			"",
		].join("\n"),
	);
}
