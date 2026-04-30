import { describe, expect, test } from "bun:test";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const PACKAGE_SRC_TEST_PATTERN = /^packages\/[^/]+\/src\//u;
const MAX_PACKAGE_CODE_LINES = 1_500;

const PACKAGE_RULES = new Map<string, readonly string[]>([
	[
		"@openagentlayer/source",
		["@openagentlayer/render", "@openagentlayer/install"],
	],
	[
		"@openagentlayer/render",
		["@openagentlayer/cli", "@openagentlayer/install"],
	],
	["@openagentlayer/install", ["@openagentlayer/cli"]],
	[
		"@openagentlayer/adapters",
		["@openagentlayer/cli", "@openagentlayer/install"],
	],
]);

describe("OAL package boundaries", () => {
	test("keeps workspace package identity under OpenAgentLayer namespace", async () => {
		const rootManifest = JSON.parse(await Bun.file("package.json").text()) as {
			readonly bin?: Record<string, string>;
			readonly name?: string;
		};
		expect(rootManifest.name).toBe("openagentlayer");
		expect(rootManifest.bin?.["oal"]).toBe("packages/cli/src/cli.ts");
		expect(await directoryExists(join("packages", "oal"))).toBe(false);

		const packageNames = await readWorkspacePackageNames();
		expect(packageNames.length).toBeGreaterThan(0);
		expect(
			packageNames.filter((name) => !name.startsWith("@openagentlayer/")),
		).toEqual([]);
	});

	test("keeps forbidden package dependencies out of package manifests", async () => {
		const violations: string[] = [];
		for (const [packageName, forbiddenDependencies] of PACKAGE_RULES) {
			const manifest = await readPackageManifest(packageName);
			const dependencies = Object.keys(manifest.dependencies ?? {});
			for (const forbiddenDependency of forbiddenDependencies) {
				if (dependencies.includes(forbiddenDependency)) {
					violations.push(`${packageName} -> ${forbiddenDependency}`);
				}
			}
		}

		expect(violations).toEqual([]);
	});

	test("keeps package tests outside src directories", async () => {
		const testPaths = await listFiles("packages");
		expect(
			testPaths
				.filter((path) => path.endsWith(".test.ts"))
				.filter((path) => PACKAGE_SRC_TEST_PATTERN.test(path)),
		).toEqual([]);
	});

	test("keeps installer public entrypoint as module barrel", async () => {
		const index = await Bun.file("packages/install/src/index.ts").text();
		expect(index.split("\n").length).toBeLessThanOrEqual(40);
		expect(index).not.toContain("function parseStructuredContent");
		expect(index).not.toContain("function uninstallManagedEntry");
		expect(index).not.toContain("function verifyHookScript");
		expect(index).not.toContain("function mergeArtifactContent");
	});

	test("keeps runtime public entrypoint as module barrel", async () => {
		const index = await Bun.file("packages/runtime/src/index.ts").text();
		expect(index.split("\n").length).toBeLessThanOrEqual(40);
		expect(index).not.toContain("function evaluateCompletionGate");
		expect(index).not.toContain("function evaluateRuntimePolicy");
		expect(index).not.toContain("function evaluateSourceDriftGuard");
		expect(index).not.toContain("function renderRuntimeScript");
	});

	test("keeps adapter provider indexes as small factories", async () => {
		for (const provider of ["claude", "codex", "opencode"]) {
			const index = await Bun.file(
				`packages/adapters/src/providers/${provider}/index.ts`,
			).text();
			expect(index.split("\n").length).toBeLessThanOrEqual(40);
			expect(index).not.toContain("renderRuntimeScript");
			expect(index).not.toContain("validateConfigObject");
			expect(index).not.toContain("renderMarkdownWithFrontmatter");
		}
	});

	test("keeps shared adapter entrypoint as barrel", async () => {
		const index = await Bun.file(
			"packages/adapters/src/shared/index.ts",
		).text();
		expect(index.split("\n").length).toBeLessThanOrEqual(20);
		expect(index).not.toContain("function ");
		expect(index).not.toContain("interface ");
		expect(index).toContain("export {");
	});

	test("keeps adapter providers isolated from each other", async () => {
		const providerFiles = (await listFiles("packages/adapters/src/providers"))
			.filter((path) => path.endsWith(".ts"))
			.filter((path) => !path.endsWith("index.ts"));
		const violations: string[] = [];
		for (const path of providerFiles) {
			const provider = path.split("/")[4];
			const content = await readFile(path, "utf8");
			for (const otherProvider of ["claude", "codex", "opencode"]) {
				if (otherProvider === provider) {
					continue;
				}
				if (content.includes(`providers/${otherProvider}`)) {
					violations.push(`${path} -> ${otherProvider}`);
				}
			}
		}

		expect(violations).toEqual([]);
	});

	test("keeps package code and test files below split threshold", async () => {
		const files = (await listFiles("packages")).filter(isPackageCodeFile);
		const oversizedFiles: string[] = [];
		for (const path of files) {
			const lineCount = countLines(await readFile(path, "utf8"));
			if (lineCount > MAX_PACKAGE_CODE_LINES) {
				oversizedFiles.push(`${path}: ${lineCount}`);
			}
		}

		expect(oversizedFiles).toEqual([]);
	});

	test("keeps CLI binary entrypoint thin", async () => {
		const entrypoint = await Bun.file("packages/cli/src/cli.ts").text();
		expect(entrypoint.split("\n").length).toBeLessThanOrEqual(40);
		expect(entrypoint).not.toContain("async function checkCommand");
		expect(entrypoint).not.toContain("function parseOptions");
		expect(entrypoint).not.toContain("function printDiagnostics");
		expect(entrypoint).not.toContain("function verifyRenderedHooks");
	});

	test("keeps package modules from importing CLI internals", async () => {
		const packageNamePattern = ["@openagentlayer", "cli"].join("/");
		const sourcePathPattern = ["packages", "cli", "src"].join("/");
		const files = (await listFiles("packages"))
			.filter(isPackageCodeFile)
			.filter((path) => !path.startsWith("packages/cli/"))
			.filter(
				(path) =>
					path !== "packages/testkit/__tests__/src/package-boundaries.test.ts",
			);
		const violations: string[] = [];
		for (const path of files) {
			const content = await readFile(path, "utf8");
			if (
				content.includes(packageNamePattern) ||
				content.includes(sourcePathPattern)
			) {
				violations.push(path);
			}
		}

		expect(violations).toEqual([]);
	});
});

async function readPackageManifest(packageName: string): Promise<{
	readonly dependencies?: Record<string, string>;
}> {
	const packageDirectory = packageName.replace("@openagentlayer/", "");
	const text = await Bun.file(
		join("packages", packageDirectory, "package.json"),
	).text();
	return JSON.parse(text) as { readonly dependencies?: Record<string, string> };
}

async function readWorkspacePackageNames(): Promise<readonly string[]> {
	const entries = await readdir("packages", { withFileTypes: true });
	const names: string[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}
		const manifest = JSON.parse(
			await Bun.file(join("packages", entry.name, "package.json")).text(),
		) as { readonly name?: string };
		if (manifest.name !== undefined) {
			names.push(manifest.name);
		}
	}
	return names.sort();
}

async function directoryExists(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return false;
		}
		throw error;
	}
}

async function listFiles(directory: string): Promise<readonly string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const paths: string[] = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			paths.push(...(await listFiles(path)));
		}
		if (entry.isFile()) {
			paths.push(path);
		}
	}
	return paths.sort();
}

function isPackageCodeFile(path: string): boolean {
	return path.endsWith(".ts") || path.endsWith(".mjs");
}

function countLines(content: string): number {
	if (content.length === 0) {
		return 0;
	}
	return content.split("\n").length;
}
