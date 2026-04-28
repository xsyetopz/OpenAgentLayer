import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { explain, render } from "../packages/oal/src/render";
import { withTempRepo } from "./helpers/oal";

describe("oal render", () => {
	test("renders deterministic tree with manifest and explain map", () => {
		withTempRepo((root) => {
			const first = resolve(root, "first");
			const second = resolve(root, "second");
			render(root, first);
			render(root, second);
			expect(readFileSync(resolve(first, "source-index.json"), "utf8")).toEqual(
				readFileSync(resolve(second, "source-index.json"), "utf8"),
			);
			expect(
				readFileSync(resolve(first, ".oal/render-manifest.json"), "utf8"),
			).toEqual(
				readFileSync(resolve(second, ".oal/render-manifest.json"), "utf8"),
			);
			expect(readFileSync(resolve(first, "codex/AGENTS.md"), "utf8")).toContain(
				"### Athena",
			);
			expect(
				readFileSync(resolve(first, "codex/config.toml"), "utf8"),
			).toContain("multi_agent_v2 = true");
			const managedFiles = JSON.parse(
				readFileSync(resolve(first, ".oal/managed-files.json"), "utf8"),
			) as { files: string[] };
			expect(managedFiles.files).toContain(".oal/render-manifest.json");
			expect(managedFiles.files).toContain(".oal/managed-files.json");
			expect(managedFiles.files).toContain(".oal/explain-map.json");
			expect(explain(root, `${first}/agents/athena.json`, first)).toEqual({
				sha256: expect.any(String),
				sources: ["source/agents/athena.json"],
			});
		});
	});
});
