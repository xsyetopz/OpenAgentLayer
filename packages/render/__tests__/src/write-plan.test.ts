import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	applyWritePlan,
	createWritePlan,
	serializeWritePlan,
} from "@openagentlayer/render";
import { loadSourceGraph } from "@openagentlayer/source";
import { createFixtureRoot } from "@openagentlayer/testkit";

describe("OAL render write plan", () => {
	test("produces deterministic render write plan", async () => {
		const result = await loadSourceGraph(process.cwd());
		expect(result.graph).toBeDefined();
		if (result.graph === undefined) {
			throw new Error("Expected graph.");
		}

		const outDir = join(await createFixtureRoot(), "generated");
		const first = serializeWritePlan(
			await createWritePlan(result.graph, outDir),
		);
		const second = serializeWritePlan(
			await createWritePlan(result.graph, outDir),
		);

		expect(second).toBe(first);
		expect(first).toContain("add\tgraph.json");
		expect(first).toContain("add\tmanifest.json");
		expect(first).toContain("add\t.codex/config.toml");
		expect(first).toContain("add\t.claude/settings.json");
		expect(first).toContain("add\topencode.json");
	});

	test("reports unchanged, changed, and removed generated artifacts", async () => {
		const result = await loadSourceGraph(process.cwd());
		expect(result.graph).toBeDefined();
		if (result.graph === undefined) {
			throw new Error("Expected graph.");
		}

		const outDir = join(await createFixtureRoot(), "generated");
		await applyWritePlan(await createWritePlan(result.graph, outDir));
		const manifest = JSON.parse(
			await Bun.file(join(outDir, "manifest.json")).text(),
		) as { readonly generated_by?: string };
		expect(manifest.generated_by).toBe("openagentlayer");
		await writeFile(join(outDir, "manifest.json"), "stale\n");
		await mkdir(join(outDir, "obsolete"), { recursive: true });
		await writeFile(join(outDir, "obsolete/file.txt"), "remove\n");

		const plan = await createWritePlan(result.graph, outDir);
		const actions = serializeWritePlan(plan);

		expect(actions).toContain("change\tmanifest.json");
		expect(actions).toContain("remove\tobsolete/file.txt");
		expect(actions).toContain("unchanged\tgraph.json");
	});
});
