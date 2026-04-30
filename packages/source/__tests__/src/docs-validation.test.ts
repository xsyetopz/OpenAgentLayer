import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateDocumentation } from "@openagentlayer/source/validate-docs";
import { createFixtureRoot } from "@openagentlayer/testkit";

describe("OAL docs validation", () => {
	test("fails docs audit for invalid status marker", async () => {
		const root = await createFixtureRoot();
		await mkdir(join(root, "plans"), { recursive: true });
		await writeFile(join(root, "plans/bad.md"), "- [ ] Not done — wrong\n");

		const diagnostics = await validateDocumentation(root);

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-status-marker",
		);
	});

	test("fails nested docs audit for invalid status marker", async () => {
		const root = await createFixtureRoot();
		await mkdir(join(root, "docs/surface-config"), { recursive: true });
		await writeFile(
			join(root, "docs/surface-config/bad.md"),
			"- [x] Done — wrong\n",
		);

		const diagnostics = await validateDocumentation(root);

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-status-marker",
		);
	});

	test("fails docs audit for spec missing top-level link", async () => {
		const root = await createFixtureRoot();
		await mkdir(join(root, "specs"), { recursive: true });
		await writeFile(join(root, "specs/feature.md"), "# Feature\n");

		const diagnostics = await validateDocumentation(root);

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-top-level-spec-link",
		);
	});

	test("fails docs audit for v3 doc missing evidence path", async () => {
		const root = await createFixtureRoot();
		await mkdir(join(root, "docs"), { recursive: true });
		await writeFile(join(root, "docs/v3-study.md"), "# v3\n");

		const diagnostics = await validateDocumentation(root);

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-v3-evidence-path",
		);
	});
});
