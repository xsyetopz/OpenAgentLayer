import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import { createFixtureRoot, writeAgent } from "@openagentlayer/testkit";
import { artifactContent } from "../_helpers/registry";

describe("OAL Codex model-plan rendering", () => {
	test("reports missing model plan without hardcoded fallback profile", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { surfaces: '["codex"]' });
		const sourceResult = await loadSourceGraph(root);
		if (sourceResult.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}

		const bundle = createAdapterRegistry().renderSurfaceBundle(
			sourceResult.graph,
			"codex",
		);
		const config = artifactContent(bundle, ".codex/config.toml");
		const parsedConfig = Bun.TOML.parse(config ?? "") as {
			readonly profiles?: Record<string, unknown>;
		};

		expect(bundle.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "missing-model-plan",
				level: "error",
			}),
		);
		expect(parsedConfig.profiles).toEqual({});
		expect(config).not.toContain("[profiles.openagentlayer]");
	});
});
