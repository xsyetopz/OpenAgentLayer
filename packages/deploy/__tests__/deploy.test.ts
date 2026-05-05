import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyDeploy, globalArtifacts, planDeploy, uninstall } from "../src";

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
	expect(config).toContain(join(home, ".codex/agents/athena.toml"));
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
