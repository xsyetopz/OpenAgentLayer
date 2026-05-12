import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	artifactHash,
	compareArtifacts,
	withProvenance,
	writeArtifacts,
} from "../src";

test("artifact hashing and drift comparison detect edited files", async () => {
	const root = await mkdtemp(join(tmpdir(), "oal-artifact-test-"));
	const artifact = {
		provider: "codex" as const,
		path: "owned.txt",
		content: "owned\n",
		sourceId: "test:owned",
		mode: "file" as const,
	};
	await writeArtifacts(root, [artifact]);
	expect(await compareArtifacts(root, [artifact])).toEqual([]);
	await writeFile(join(root, artifact.path), "edited\n");
	expect(await compareArtifacts(root, [artifact])).toEqual([artifact.path]);
	expect(artifactHash("owned\n")).not.toBe(artifactHash("edited\n"));
	await rm(root, { recursive: true, force: true });
});

test("toml provenance preserves schema comment as the first line", () => {
	const artifact = withProvenance({
		provider: "codex",
		path: ".codex/config.toml",
		content:
			'#:schema https://developers.openai.com/codex/config-schema.json\nprofile = "openagentlayer"\n',
		sourceId: "config:codex",
		mode: "config",
	});
	expect(artifact.content.startsWith("#:schema ")).toBe(true);
	expect(artifact.content).toContain("# >>> oal codex >>>");
	expect(artifact.content).toContain('profile = "openagentlayer"');
});
