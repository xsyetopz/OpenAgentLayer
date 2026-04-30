import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	applyInstallPlan,
	uninstallManagedFiles,
	verifyManagedInstall,
} from "@openagentlayer/install";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import { createFixtureRoot } from "@openagentlayer/testkit";

describe("OAL installer", () => {
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
		expect(() => Bun.TOML.parse(codexConfig)).not.toThrow();
	});

	test("uninstall removes only managed files", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		const neighborPath = join(
			targetRoot,
			".codex/openagentlayer/user-note.txt",
		);

		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		await mkdir(join(targetRoot, ".codex/openagentlayer"), { recursive: true });
		await writeFile(neighborPath, "keep\n");

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.removedFiles).toContain(
			join(targetRoot, ".oal/manifest/codex-project.json"),
		);
		expect(await Bun.file(neighborPath).text()).toBe("keep\n");
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(false);
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

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toEqual([]);
		expect(await Bun.file(agentsPath).text()).toBe(
			"# User Instructions\n\nKeep this.\n",
		);
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

	test("uninstall missing manifest is no-op", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.removedFiles).toEqual([]);
	});

	test("uninstall ignores forged manifest target root", async () => {
		const targetRoot = await createFixtureRoot();
		const forgedTargetRoot = await createFixtureRoot();
		const externalVictim = join(forgedTargetRoot, "victim.txt");
		const localManagedFile = join(targetRoot, "victim.txt");
		const manifestPath = join(targetRoot, ".oal/manifest/codex-project.json");

		await mkdir(join(targetRoot, ".oal/manifest"), { recursive: true });
		await writeFile(externalVictim, "external\n");
		await writeFile(localManagedFile, "local\n");
		await writeFile(
			manifestPath,
			JSON.stringify({
				entries: [
					{
						artifactKind: "config",
						path: "victim.txt",
						sha256: "forged",
						sourceRecordIds: [],
					},
				],
				generatedAt: "deterministic",
				scope: "project",
				surface: "codex",
				targetRoot: forgedTargetRoot,
			}),
		);

		await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(await Bun.file(externalVictim).text()).toBe("external\n");
		expect(await Bun.file(localManagedFile).exists()).toBe(false);
	});

	test("install verification accepts clean managed files", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});

		const result = await verifyManagedInstall({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toEqual([]);
	});

	test("install verification reports missing managed files", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		await rm(join(targetRoot, ".codex/config.toml"), {
			force: true,
		});

		const result = await verifyManagedInstall({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "missing-file" }),
		);
	});

	test("install verification reports hash mismatch", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		await writeFile(join(targetRoot, ".codex/config.toml"), "changed\n");

		const result = await verifyManagedInstall({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "hash-mismatch" }),
		);
	});

	test("uninstall preserves user-edited managed config values", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "managed-content-changed" }),
		);
		expect(await Bun.file(join(targetRoot, ".codex/config.toml")).text()).toBe(
			"[features]\nfast_mode = true\n",
		);
		const manifestPath = join(targetRoot, ".oal/manifest/codex-project.json");
		expect(await Bun.file(manifestPath).exists()).toBe(true);
		const manifest = JSON.parse(await Bun.file(manifestPath).text()) as {
			readonly entries: readonly { readonly path: string }[];
		};
		expect(manifest.entries.map((entry) => entry.path)).toContain(
			".codex/config.toml",
		);
	});

	test("install verification reports forged escaping manifest path", async () => {
		const targetRoot = await createFixtureRoot();
		const manifestPath = join(targetRoot, ".oal/manifest/codex-project.json");
		await mkdir(join(targetRoot, ".oal/manifest"), { recursive: true });
		await writeFile(
			manifestPath,
			JSON.stringify({
				entries: [
					{
						artifactKind: "config",
						path: "../escape.txt",
						sha256: "bad",
						sourceRecordIds: [],
					},
				],
				generatedAt: "deterministic",
				scope: "project",
				surface: "codex",
				targetRoot,
			}),
		);

		const result = await verifyManagedInstall({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "path-escape" }),
		);
	});
});

async function createInstallFixture() {
	const sourceResult = await loadSourceGraph(process.cwd());
	if (sourceResult.graph === undefined) {
		throw new Error("Expected graph.");
	}
	const targetRoot = await createFixtureRoot();
	const registry = createAdapterRegistry();
	return {
		targetRoot,
		codexBundle: registry.renderSurfaceBundle(sourceResult.graph, "codex"),
	};
}
