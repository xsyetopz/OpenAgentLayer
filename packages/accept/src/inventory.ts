import { execFile } from "node:child_process";
import { promisify } from "node:util";

const TRACKED_PRODUCT_ROOTS = [
	"crates",
	"packages",
	"source",
	"tests",
	"homebrew",
	"plugins",
	"scripts",
] as const;
const REFERENCE_ROOTS = ["docs", "specs", "third_party"] as const;
const ROOT_PRODUCT_FILES = [
	"package.json",
	"tsconfig.json",
	"tsconfig.base.json",
	"biome.jsonc",
	"README.md",
	"INSTALLATION.md",
	"CHANGELOG.md",
	"CONTRIBUTING.md",
	"SECURITY.md",
	"upstream-sources.lock.json",
	"bunfig.toml",
	"Cargo.toml",
	"Cargo.lock",
] as const;
const ROOT_PRODUCT_DIRS = [".agents", ".claude-plugin"] as const;
const PRODUCT_FILE_PATTERN = /\.(ts|mts|mjs|json|jsonc|md|toml)$/;
const GENERATED_PATH_PATTERN = /(^|\/)(generated|dist|build)(\/|$)/;
const execFileAsync = promisify(execFile);

export interface RepositoryInventory {
	authoredSourcePaths: string[];
	generatedOutputPaths: string[];
	runtimeHookPaths: string[];
	cliGeneratorDeployerPaths: string[];
	validationPaths: string[];
	disconnectedPaths: string[];
}

export async function inspectRepository(
	repoRoot: string,
): Promise<RepositoryInventory> {
	const relativeFiles = await listFiles(repoRoot);
	const inventory: RepositoryInventory = {
		authoredSourcePaths: relativeFiles.filter((path) =>
			path.startsWith("source/"),
		),
		generatedOutputPaths: relativeFiles.filter((path) =>
			GENERATED_PATH_PATTERN.test(path),
		),
		runtimeHookPaths: relativeFiles.filter((path) =>
			path.startsWith("packages/runtime/hooks/"),
		),
		cliGeneratorDeployerPaths: relativeFiles.filter(
			(path) =>
				path.startsWith("packages/cli/") ||
				path.startsWith("packages/adapter/") ||
				path.startsWith("packages/deploy/"),
		),
		validationPaths: relativeFiles.filter(
			(path) =>
				path.startsWith("packages/accept/") ||
				path.startsWith("packages/policy/"),
		),
		disconnectedPaths: [],
	};
	inventory.disconnectedPaths = findDisconnectedProductPaths(relativeFiles);
	return inventory;
}

export async function assertRepositoryInventory(
	repoRoot: string,
): Promise<void> {
	const inventory = await inspectRepository(repoRoot);
	assertNonEmpty("authored source", inventory.authoredSourcePaths);
	assertNonEmpty("runtime hooks", inventory.runtimeHookPaths);
	assertNonEmpty("CLI/generator/deployer", inventory.cliGeneratorDeployerPaths);
	assertNonEmpty("validation", inventory.validationPaths);
	if (inventory.disconnectedPaths.length > 0)
		throw new Error(
			`Disconnected active product files: ${inventory.disconnectedPaths.join(", ")}`,
		);
}

function assertNonEmpty(label: string, paths: string[]): void {
	if (paths.length === 0)
		throw new Error(`Repository inventory has no \`${label}\` paths`);
}

function findDisconnectedProductPaths(relativeFiles: string[]): string[] {
	const active = new Set<string>();
	for (const rootFile of ROOT_PRODUCT_FILES) active.add(rootFile);
	for (const file of relativeFiles) {
		if (TRACKED_PRODUCT_ROOTS.some((root) => file.startsWith(`${root}/`)))
			active.add(file);
		if (ROOT_PRODUCT_DIRS.some((root) => file.startsWith(`${root}/`)))
			active.add(file);
		if (REFERENCE_ROOTS.some((root) => file.startsWith(`${root}/`)))
			active.add(file);
		if (file === "bun.lock" || file.startsWith(".rtk/")) active.add(file);
	}
	return relativeFiles.filter(
		(file) =>
			PRODUCT_FILE_PATTERN.test(file) &&
			!active.has(file) &&
			!file.startsWith("node_modules/") &&
			!file.startsWith("marketplace/"),
	);
}

async function listFiles(root: string): Promise<string[]> {
	const { stdout } = await execFileAsync("git", [
		"-C",
		root,
		"ls-files",
		"--cached",
	]);
	return stdout.split("\n").filter(Boolean).map(normalizePath);
}

function normalizePath(path: string): string {
	return path.split("\\").join("/");
}
