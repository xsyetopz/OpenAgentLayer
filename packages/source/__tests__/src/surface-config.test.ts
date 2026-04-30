import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasErrors } from "@openagentlayer/diagnostics";
import { loadSourceGraph } from "@openagentlayer/source";
import { createFixtureRoot, writeAgent } from "@openagentlayer/testkit";

describe("OAL source surface-config validation", () => {
	test("fails missing surface config", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await rm(join(root, "source/surface-configs/opencode"), {
			force: true,
			recursive: true,
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-surface-config",
		);
	});

	test("fails duplicate surface config", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		const directory = join(root, "source/surface-configs/opencode-copy");
		await mkdir(directory, { recursive: true });
		await writeFile(
			join(directory, "surface-config.toml"),
			[
				'id = "opencode-surface-config-copy"',
				'kind = "surface-config"',
				'title = "OpenCode Surface Config Copy"',
				'description = "Duplicate fixture."',
				'surface = "opencode"',
				'surfaces = ["opencode"]',
				'allowed_key_paths = ["*"]',
				"do_not_emit_key_paths = []",
				"validation_rules = []",
				"",
				"[project_defaults]",
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

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"duplicate-surface-config",
		);
	});

	test("fails upstream schema cache hash mismatch", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeUpstreamManifest(root, {
			sha256: "bad-hash",
			sourceUrl: "https://example.test/schema.json",
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"upstream-schema-hash-mismatch",
		);
	});

	test("fails surface config source URL missing from upstream manifest", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeUpstreamManifest(root, {
			sourceUrl: "https://example.test/schema.json",
		});
		const configPath = join(
			root,
			"source/surface-configs/codex/surface-config.toml",
		);
		const source = await Bun.file(configPath).text();
		await Bun.write(
			configPath,
			source.replace(
				'source_url = "fixture"',
				'source_url = "https://example.test/unlisted.json"',
			),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-upstream-source-url",
		);
	});
});

async function writeUpstreamManifest(
	root: string,
	options: {
		readonly sha256?: string;
		readonly sourceUrl: string;
	},
): Promise<void> {
	const directory = join(root, "source/schemas/upstream");
	const schemaPath = join(directory, "fixture.schema.json");
	const schemaBody = '{ "type": "object" }\n';
	await mkdir(directory, { recursive: true });
	await writeFile(schemaPath, schemaBody);
	await writeFile(
		join(directory, "manifest.json"),
		`${JSON.stringify(
			{
				entries: [
					{
						content_type: "json-schema",
						extraction_status: "raw-upstream-cached",
						id: "fixture-schema",
						path: "source/schemas/upstream/fixture.schema.json",
						retrieval_date: "2026-04-30",
						sha256:
							options.sha256 ??
							createHash("sha256").update(schemaBody).digest("hex"),
						source_url: options.sourceUrl,
						surface: "codex",
					},
				],
				retrieval_date: "2026-04-30",
			},
			null,
			2,
		)}\n`,
	);
}
