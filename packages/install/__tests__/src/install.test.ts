import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyInstallPlan } from "@openagentlayer/install";
import { createInstallFixture } from "../_helpers/install";

const INSTALL_MODE_PATTERN =
	/^(full-file|marked-text-block|structured-object)$/u;

describe("OAL installer writes", () => {
	test("project install writes selected surface artifacts and manifest", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();

		const result = await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});

		expect(result.manifest.surface).toBe("codex");
		expect(result.writtenFiles).toContain(
			join(targetRoot, ".oal/manifest/codex-project.json"),
		);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).text(),
		).toContain("fast_mode = false");
		const codexConfig = await Bun.file(
			join(targetRoot, ".codex/config.toml"),
		).text();
		const manifest = JSON.parse(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).text(),
		) as { readonly entries: readonly { readonly path: string }[] };
		expect(manifest.entries.map((entry) => entry.path)).toEqual(
			expect.arrayContaining([
				".codex/openagentlayer/plugin/skills/review-policy/SKILL.md",
				".codex/openagentlayer/plugin/skills/taste/SKILL.md",
				".codex/openagentlayer/plugin/skills/taste-stitch/reference/upstream/DESIGN.md",
				".codex/openagentlayer/runtime/completion-gate.mjs",
			]),
		);
		expect(() => Bun.TOML.parse(codexConfig)).not.toThrow();
	});

	test("project install manifests provider-native ownership modes", async () => {
		const { targetRoot, claudeBundle, codexBundle, opencodeBundle } =
			await createInstallFixture();

		for (const bundle of [codexBundle, claudeBundle, opencodeBundle]) {
			await applyInstallPlan({
				bundle,
				scope: "project",
				targetRoot,
			});
		}

		const codexManifest = await readManifest(targetRoot, "codex");
		const claudeManifest = await readManifest(targetRoot, "claude");
		const opencodeManifest = await readManifest(targetRoot, "opencode");
		const codexConfig = manifestEntry(codexManifest, ".codex/config.toml");
		const codexInstructions = manifestEntry(codexManifest, "AGENTS.md");
		const codexRuntime = manifestEntry(
			codexManifest,
			".codex/openagentlayer/runtime/completion-gate.mjs",
		);
		const claudeConfig = manifestEntry(claudeManifest, ".claude/settings.json");
		const claudeInstructions = manifestEntry(claudeManifest, "CLAUDE.md");
		const opencodeConfig = manifestEntry(opencodeManifest, "opencode.json");
		const opencodeRuntime = manifestEntry(
			opencodeManifest,
			".opencode/openagentlayer/runtime/completion-gate.mjs",
		);

		expect(codexConfig?.installMode).toBe("structured-object");
		expect(Object.keys(codexConfig?.managedValues ?? {})).toContain(
			"features.fast_mode",
		);
		expect(codexInstructions?.installMode).toBe("marked-text-block");
		expect(typeof codexInstructions?.blockContent).toBe("string");
		expect(codexRuntime?.installMode).toBe("full-file");
		expect(claudeConfig?.installMode).toBe("structured-object");
		expect(Object.keys(claudeConfig?.managedValues ?? {})).toContain(
			"hooks.Stop",
		);
		expect(claudeInstructions?.installMode).toBe("marked-text-block");
		expect(typeof claudeInstructions?.blockContent).toBe("string");
		expect(opencodeConfig?.installMode).toBe("structured-object");
		expect(Object.keys(opencodeConfig?.managedValues ?? {})).toContain(
			"plugin",
		);
		expect(opencodeRuntime?.installMode).toBe("full-file");
	});

	test("project install manifests every rendered artifact for all surfaces", async () => {
		const { targetRoot, claudeBundle, codexBundle, opencodeBundle } =
			await createInstallFixture();

		for (const bundle of [codexBundle, claudeBundle, opencodeBundle]) {
			await applyInstallPlan({
				bundle,
				scope: "project",
				targetRoot,
			});
			const manifest = await readManifest(targetRoot, bundle.surface);
			const manifestPaths = manifest.entries.map((entry) => entry.path).sort();

			expect(manifestPaths).toEqual(
				bundle.artifacts.map((artifact) => artifact.path).sort(),
			);
			for (const entry of manifest.entries) {
				expect(entry.installMode).toMatch(INSTALL_MODE_PATTERN);
				expect(typeof entry.sha256).toBe("string");
				expect(entry.sha256.length).toBe(64);
			}
		}
	});

	test("installed runtime scripts are manifest-owned and executable", async () => {
		const { targetRoot, claudeBundle, codexBundle, opencodeBundle } =
			await createInstallFixture();

		for (const bundle of [codexBundle, claudeBundle, opencodeBundle]) {
			await applyInstallPlan({
				bundle,
				scope: "project",
				targetRoot,
			});
		}

		for (const [surface, runtimePath] of [
			["codex", ".codex/openagentlayer/runtime/completion-gate.mjs"],
			["claude", ".claude/openagentlayer/runtime/completion-gate.mjs"],
			["opencode", ".opencode/openagentlayer/runtime/completion-gate.mjs"],
		] as const) {
			const manifest = await readManifest(targetRoot, surface);
			expect(manifestEntry(manifest, runtimePath)?.installMode).toBe(
				"full-file",
			);
			const process = Bun.spawn(["bun", join(targetRoot, runtimePath)], {
				stderr: "pipe",
				stdin: "pipe",
				stdout: "pipe",
			});
			process.stdin.write(
				JSON.stringify({ metadata: { validation: "passed" } }),
			);
			process.stdin.end();
			const [exitCode, stdout] = await Promise.all([
				process.exited,
				new Response(process.stdout).text(),
			]);
			expect(exitCode).toBe(0);
			expect(JSON.parse(stdout)).toMatchObject({
				decision: "allow",
				policy_id: "completion-gate",
			});
		}
	});

	test("install merges AGENTS.md without overwriting user content", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		const agentsPath = join(targetRoot, "AGENTS.md");
		await writeFile(agentsPath, "# User Instructions\n\nKeep this.\n");

		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});

		const installed = await Bun.file(agentsPath).text();
		expect(installed).toContain("# User Instructions");
		expect(installed).toContain("Keep this.");
		expect(installed).toContain(
			"BEGIN OPENAGENTLAYER:codex:codex-instructions",
		);
		expect(installed).toContain("OpenAgentLayer Codex Instructions");
	});

	test("install rejects preexisting user-owned config conflicts", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await mkdir(join(targetRoot, ".codex"), { recursive: true });
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		await expect(
			applyInstallPlan({
				bundle: codexBundle,
				scope: "project",
				targetRoot,
			}),
		).rejects.toThrow("config-conflict");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
		expect(await Bun.file(join(targetRoot, ".codex/config.toml")).text()).toBe(
			"[features]\nfast_mode = true\n",
		);
	});

	test("reinstall may update manifest-owned config keys", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		const changedBundle = {
			...codexBundle,
			artifacts: codexBundle.artifacts.map((artifact) =>
				artifact.path === ".codex/config.toml"
					? {
							...artifact,
							content: artifact.content.replace(
								"fast_mode = false",
								"fast_mode = true",
							),
						}
					: artifact,
			),
		};

		await applyInstallPlan({
			bundle: changedBundle,
			scope: "project",
			targetRoot,
		});

		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).text(),
		).toContain("fast_mode = true");
	});

	test("install rejects managed paths that escape target root", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();

		await expect(
			applyInstallPlan({
				bundle: {
					...codexBundle,
					artifacts: [
						{
							content: "bad\n",
							kind: "config",
							path: "../escape.txt",
							sourceRecordIds: [],
							surface: "codex",
						},
					],
				},
				scope: "project",
				targetRoot,
			}),
		).rejects.toThrow("escapes target root");
	});
});

async function readManifest(
	targetRoot: string,
	surface: "claude" | "codex" | "opencode",
): Promise<{
	readonly entries: readonly {
		readonly blockContent?: string;
		readonly installMode: string;
		readonly managedValues?: Record<string, unknown>;
		readonly path: string;
		readonly sha256: string;
	}[];
}> {
	return JSON.parse(
		await Bun.file(
			join(targetRoot, `.oal/manifest/${surface}-project.json`),
		).text(),
	) as {
		readonly entries: readonly {
			readonly blockContent?: string;
			readonly installMode: string;
			readonly managedValues?: Record<string, unknown>;
			readonly path: string;
			readonly sha256: string;
		}[];
	};
}

function manifestEntry(
	manifest: {
		readonly entries: readonly {
			readonly blockContent?: string;
			readonly installMode: string;
			readonly managedValues?: Record<string, unknown>;
			readonly path: string;
			readonly sha256: string;
		}[];
	},
	path: string,
):
	| {
			readonly blockContent?: string;
			readonly installMode: string;
			readonly managedValues?: Record<string, unknown>;
			readonly path: string;
			readonly sha256: string;
	  }
	| undefined {
	return manifest.entries.find((item) => item.path === path);
}
