import { expect, test } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadSource } from "@openagentlayer/source";
import { allPluginProviders, syncPlugins } from "../src";

const repoRoot = resolve(import.meta.dir, "../../..");
const claudePluginRoot = ["${", "CLAUDE_PLUGIN_ROOT", "}"].join("");

test("plugin sync writes provider payloads and prunes stale OAL caches", async () => {
	const home = await mkdtemp(join(tmpdir(), "oal-plugins-"));
	try {
		await seedStaleCaches(home);
		const graph = await loadSource(resolve(repoRoot, "source"));
		const version = graph.source.version;
		const preview = await syncPlugins({
			repoRoot,
			home,
			source: graph.source,
			providers: allPluginProviders(),
			dryRun: true,
		});
		expect(
			preview.changes.some((change) =>
				change.path.endsWith(".codex-plugin/plugin.json"),
			),
		).toBe(true);

		const applied = await syncPlugins({
			repoRoot,
			home,
			source: graph.source,
			providers: allPluginProviders(),
		});
		expect(applied.changes.some((change) => change.action === "remove")).toBe(
			true,
		);
		expect(
			await readFile(
				join(home, ".codex/plugins/openagentlayer/.codex-plugin/plugin.json"),
				"utf8",
			),
		).toContain('"oal"');
		expect(
			await readFile(
				join(
					home,
					`.codex/plugins/cache/openagentlayer-local/oal/${version}/skills/review/SKILL.md`,
				),
				"utf8",
			),
		).toContain("Review");
		expect(
			(
				await stat(
					join(
						home,
						`.codex/plugins/cache/openagentlayer-local/oal/${version}/hooks/inject-route-context.mjs`,
					),
				)
			).mode & 0o111,
		).not.toBe(0);
		expect(
			await readFile(
				join(
					home,
					".claude/plugins/marketplaces/openagentlayer/.claude-plugin/plugin.json",
				),
				"utf8",
			),
		).toContain('"oal"');
		expect(
			await readFile(
				join(
					home,
					`.claude/plugins/cache/openagentlayer/openagentlayer/${version}/hooks/hooks.json`,
				),
				"utf8",
			),
		).toContain(`${claudePluginRoot}/hooks/scripts/`);
		expect(
			await readFile(
				join(home, ".config/opencode/plugins/openagentlayer/package.json"),
				"utf8",
			),
		).toContain("openagentlayer-opencode-plugin");
		expect(
			await readFile(join(home, ".agents/plugins/marketplace.json"), "utf8"),
		).toContain('"name": "oal"');
		expect(await readFile(join(home, ".codex/config.toml"), "utf8")).toContain(
			'[plugins."oal@openagentlayer-local"]',
		);
		expect(
			await readFile(join(home, ".codex/config.toml"), "utf8"),
		).not.toContain("openagentsbtw");
		expect(
			await readFile(join(home, ".agents/plugins/marketplace.json"), "utf8"),
		).not.toContain("openagentsbtw");
		await expect(
			readFile(
				join(
					home,
					".codex/plugins/cache/openagentlayer-local/oal/0.0.1/stale.txt",
				),
				"utf8",
			),
		).rejects.toThrow();
		expect(
			await readFile(
				join(home, ".codex/plugins/cache/openagentlayer-local/other/keep.txt"),
				"utf8",
			),
		).toBe("keep");
		for (const path of [
			".codex/plugins/openagentsbtw/stale.txt",
			".codex/plugins/cache/openagentsbtw-local/oal/stale.txt",
			".claude/plugins/marketplaces/openagentsbtw/stale.txt",
			".claude/plugins/cache/openagentsbtw/stale.txt",
			".config/opencode/plugins/openagentsbtw/stale.txt",
			".config/opencode/plugins/cache/openagentsbtw/stale.txt",
		])
			await expect(readFile(join(home, path), "utf8")).rejects.toThrow();
	} finally {
		await rm(home, { recursive: true, force: true });
	}
});

async function seedStaleCaches(home: string): Promise<void> {
	const staleCodex = join(
		home,
		".codex/plugins/cache/openagentlayer-local/oal/0.0.1",
	);
	const otherCodex = join(
		home,
		".codex/plugins/cache/openagentlayer-local/other",
	);
	const staleClaude = join(
		home,
		".claude/plugins/cache/temp_local_openagentlayer",
	);
	const staleOpenCode = join(
		home,
		".config/opencode/plugins/cache/openagentlayer/0.0.1",
	);
	const stalePaths = [
		staleCodex,
		otherCodex,
		staleClaude,
		staleOpenCode,
		join(home, ".codex/plugins/openagentsbtw"),
		join(home, ".codex/plugins/cache/openagentsbtw-local/oal"),
		join(home, ".claude/plugins/marketplaces/openagentsbtw"),
		join(home, ".claude/plugins/cache/openagentsbtw"),
		join(home, ".config/opencode/plugins/openagentsbtw"),
		join(home, ".config/opencode/plugins/cache/openagentsbtw"),
	];
	for (const path of stalePaths) await mkdir(path, { recursive: true });
	await writeFile(join(staleCodex, "stale.txt"), "stale");
	await writeFile(join(otherCodex, "keep.txt"), "keep");
	for (const path of stalePaths.filter((path) => path !== otherCodex))
		await writeFile(join(path, "stale.txt"), "stale");
	await writeFile(
		join(home, ".codex/config.toml"),
		[
			'[plugins."oal@openagentsbtw-local"]',
			"enabled = true",
			"",
			'[plugins."openagentsbtw@openagentsbtw-local"]',
			"enabled = true",
			"",
		].join("\n"),
	);
	await mkdir(join(home, ".agents/plugins"), { recursive: true });
	await writeFile(
		join(home, ".agents/plugins/marketplace.json"),
		JSON.stringify(
			{
				name: "openagentlayer-local",
				plugins: [
					{ name: "openagentsbtw", source: { path: "/old" } },
					{ name: "oal", source: { path: "/old-oal" } },
				],
			},
			undefined,
			2,
		),
	);
}
