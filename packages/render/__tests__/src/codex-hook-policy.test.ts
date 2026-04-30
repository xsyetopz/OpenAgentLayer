import { describe, expect, test } from "bun:test";
import {
	artifactContent,
	artifactPaths,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL Codex hook policy rendering", () => {
	test("renders expanded Phase 24 policy hooks", async () => {
		const bundle = await renderSurfaceBundle("codex");
		const config = artifactContent(bundle, ".codex/config.toml");

		expect(artifactPaths(bundle)).toContain(
			".codex/openagentlayer/policies/secret-path-guard.json",
		);
		expect(config).toContain("[[hooks.PermissionRequest]]");
		expect(config).toContain("secret-path-guard.mjs");
	});
});
