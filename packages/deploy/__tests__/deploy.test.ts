import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OAL_CLI_ENTRY_RELATIVE } from "@openagentlayer/source";
import {
	applyBinInstall,
	applyDeploy,
	binManifestPath,
	globalArtifacts,
	planBinInstall,
	planDeploy,
	planDeployDiffs,
	removeBinInstall,
	renderDeployDiffs,
	uninstall,
} from "../src";

test("deploy plan dry-run data precedes apply and uninstall removes ownership only", async () => {
	const root = await mkdtemp(join(tmpdir(), "oal-deploy-test-"));
	const artifact = {
		provider: "codex" as const,
		path: ".codex/openagentlayer/owned.txt",
		content: "owned\n",
		sourceId: "test:owned",
		mode: "file" as const,
	};
	const plan = await planDeploy(root, [artifact]);
	expect(plan.changes).toEqual([
		{ action: "write", path: artifact.path, reason: "new managed artifact" },
	]);
	await applyDeploy(plan);
	expect(await readFile(join(root, artifact.path), "utf8")).toBe("owned\n");
	await uninstall(root, "codex");
	const after = await planDeploy(root, [artifact]);
	expect(after.changes[0]?.action).toBe("write");
	await rm(root, { recursive: true, force: true });
});

test("global deploy maps provider artifacts into provider homes", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-global-deploy-"));
	const artifacts = globalArtifacts(home, [
		{
			provider: "codex" as const,
			path: ".codex/config.toml",
			content: 'config_file = "./agents/athena.toml"\n',
			sourceId: "config:codex",
			mode: "config" as const,
		},
		{
			provider: "codex" as const,
			path: "AGENTS.md",
			content: "Global Codex instructions\n",
			sourceId: "instructions:codex",
			mode: "block" as const,
		},
		{
			provider: "codex" as const,
			path: ".codex/requirements.toml",
			content:
				'managed_dir = "__OAL_CODEX_MANAGED_HOOK_DIR__"\ncommand = "OAL_HOOK_PROVIDER=codex OAL_HOOK_EVENT=PreToolUse __OAL_CODEX_MANAGED_HOOK_DIR__/hook.mjs"\n',
			sourceId: "requirements:codex",
			mode: "config" as const,
		},
	]);
	const plan = await planDeploy(home, artifacts, {
		scope: "global",
		manifestRoot: home,
	});
	expect(plan.manifest.entries.every((entry) => entry.scope === "global")).toBe(
		true,
	);
	expect(plan.changes.map((change) => change.path)).toContain(
		".codex/AGENTS.md",
	);
	await applyDeploy(plan);
	const config = await readFile(join(home, ".codex/config.toml"), "utf8");
	const requirements = await readFile(
		join(home, ".codex/requirements.toml"),
		"utf8",
	);
	expect(config).toContain(join(home, ".codex/agents/athena.toml"));
	expect(requirements).toContain(join(home, ".codex/openagentlayer/hooks"));
	expect(requirements).toContain("OAL_HOOK_PROVIDER=codex");
	expect(requirements).toContain("OAL_HOOK_EVENT=PreToolUse");
	expect(await readFile(join(home, ".codex/AGENTS.md"), "utf8")).toContain(
		"Global Codex instructions",
	);
	expect(
		await readFile(
			join(home, ".openagentlayer/manifest/global/codex.json"),
			"utf8",
		),
	).toContain('"scope": "global"');
	await uninstall(home, "codex", { scope: "global", manifestRoot: home });
	await expect(
		readFile(join(home, ".codex/AGENTS.md"), "utf8"),
	).rejects.toThrow();
	await rm(home, { recursive: true, force: true });
});

test("dry-run diffs render merged generated artifact changes without writing", async () => {
	const root = await mkdtemp(join(tmpdir(), "oal-deploy-diff-"));
	await mkdir(join(root, ".codex"), { recursive: true });
	await Bun.write(
		join(root, "AGENTS.md"),
		[
			"user instructions",
			"",
			"<!-- >>> oal codex >>> -->",
			"old managed",
			"<!-- <<< oal codex <<< -->",
			"",
		].join("\n"),
	);
	await Bun.write(
		join(root, ".codex/config.toml"),
		'user_owned = "keep"\nold = "value"\n',
	);
	const artifacts = [
		{
			provider: "codex" as const,
			path: ".codex/openagentlayer/new.txt",
			content: "owned\n",
			sourceId: "test:new",
			mode: "file" as const,
		},
		{
			provider: "codex" as const,
			path: "AGENTS.md",
			content: "new managed\n",
			sourceId: "instructions:codex",
			mode: "block" as const,
		},
		{
			provider: "codex" as const,
			path: ".codex/config.toml",
			content: 'managed = "new"\n',
			sourceId: "config:codex",
			mode: "config" as const,
		},
	];
	const plan = await planDeploy(root, artifacts);
	const rendered = renderDeployDiffs(await planDeployDiffs(plan));
	expect(rendered).toContain("## codex .codex/openagentlayer/new.txt [file]");
	expect(rendered).toContain("source: test:new");
	expect(rendered).toContain("--- a/.codex/openagentlayer/new.txt");
	expect(rendered).toContain("+owned");
	expect(rendered).toContain("## codex AGENTS.md [block]");
	expect(rendered).toContain("user instructions");
	expect(rendered).toContain("+new managed");
	expect(rendered).toContain("## codex .codex/config.toml [config]");
	expect(rendered).toContain('user_owned = "keep"');
	expect(rendered).toContain('+managed = "new"');
	await expect(
		readFile(join(root, ".codex/openagentlayer/new.txt"), "utf8"),
	).rejects.toThrow();
	await rm(root, { recursive: true, force: true });
});

test("bin install owns oal shim", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-bin-install-"));
	const binDir = join(home, "bin");
	const entrypoint = `/repo/${OAL_CLI_ENTRY_RELATIVE}`;
	const plan = planBinInstall(binDir, entrypoint);
	await applyBinInstall(home, plan, entrypoint);
	expect(await readFile(join(binDir, "oal"), "utf8")).toContain(
		`exec bun ${JSON.stringify(entrypoint)} "$@"`,
	);
	expect(await readFile(binManifestPath(home), "utf8")).not.toContain(
		["sym", "phony"].join(""),
	);
	await removeBinInstall(home);
	await expect(readFile(join(binDir, "oal"), "utf8")).rejects.toThrow();
	await rm(home, { recursive: true, force: true });
});
