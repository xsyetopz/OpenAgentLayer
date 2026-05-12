import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SOURCE_FILE_PATTERN = /\.(ts|tsx|mts|mjs|js|json|jsonc|md)$/;
const GENERATED_PATH_PATTERN =
	/(^|\/)(dist|generated|node_modules|\.oal)(\/|$)/;
const LINE_PATTERN = /\r?\n/;
const MAX_PACKAGE_SOURCE_LINES = 10_000;
const MAX_DIRECT_SOURCE_CHILDREN = 32;
const DIRECT_SOURCE_CHILDREN_LIMITS = new Map<string, number>([
	["source/skills", 48],
]);
const MAX_SOURCE_PATH_DEPTH = 6;

export async function assertCodebaseShape(repoRoot: string): Promise<void> {
	const files = (await trackedFiles(repoRoot)).filter(isSourceFile);
	await assertPackageLineBudgets(repoRoot, files);
	assertDirectChildren(files);
	assertPathDepth(files);
}

async function assertPackageLineBudgets(
	repoRoot: string,
	files: string[],
): Promise<void> {
	const totals = new Map<string, number>();
	for (const file of files) {
		const owner = ownerFor(file);
		if (!owner) continue;
		totals.set(
			owner,
			(totals.get(owner) ?? 0) +
				lineCount(await readFile(join(repoRoot, file), "utf8")),
		);
	}
	const oversized = [...totals.entries()]
		.filter(([, lines]) => lines > MAX_PACKAGE_SOURCE_LINES)
		.map(([owner, lines]) => `${owner}:${lines}`);
	if (oversized.length > 0)
		throw new Error(
			`Codebase shape has oversized source owners over ${MAX_PACKAGE_SOURCE_LINES} lines: ${oversized.join(", ")}`,
		);
}

function assertDirectChildren(files: string[]): void {
	const directChildren = new Map<string, Set<string>>();
	for (const file of files) {
		const parts = file.split("/");
		const owner = ownerFor(file);
		if (!owner) continue;
		const ownerParts = owner.split("/");
		const child = parts[ownerParts.length];
		if (!child) continue;
		if (!directChildren.has(owner)) directChildren.set(owner, new Set());
		directChildren.get(owner)?.add(child);
	}
	const crowded = [...directChildren.entries()]
		.filter(
			([owner, children]) =>
				children.size >
				(DIRECT_SOURCE_CHILDREN_LIMITS.get(owner) ??
					MAX_DIRECT_SOURCE_CHILDREN),
		)
		.map(
			([owner, children]) =>
				`${owner}:${children.size}/${DIRECT_SOURCE_CHILDREN_LIMITS.get(owner) ?? MAX_DIRECT_SOURCE_CHILDREN}`,
		);
	if (crowded.length > 0)
		throw new Error(
			`Codebase shape has crowded source owners over direct-child limits: ${crowded.join(", ")}`,
		);
}

function assertPathDepth(files: string[]): void {
	const deep = files.filter(
		(file) => relativeSourceDepth(file) > MAX_SOURCE_PATH_DEPTH,
	);
	if (deep.length > 0)
		throw new Error(
			`Codebase shape has source paths deeper than ${MAX_SOURCE_PATH_DEPTH}: ${deep.slice(0, 20).join(", ")}`,
		);
}

function ownerFor(file: string): string | undefined {
	const parts = file.split("/");
	if (parts[0] === "packages" && parts[1]) return `packages/${parts[1]}`;
	if (parts[0] === "source" && parts[1]) return `source/${parts[1]}`;
	if (parts[0] === "tests") return "tests";
	if (parts[0] === "scripts") return "scripts";
	return undefined;
}

function relativeSourceDepth(file: string): number {
	const owner = ownerFor(file);
	if (!owner) return file.split("/").length;
	return file.split("/").length - owner.split("/").length;
}

function isSourceFile(file: string): boolean {
	return SOURCE_FILE_PATTERN.test(file) && !GENERATED_PATH_PATTERN.test(file);
}

function lineCount(content: string): number {
	return content.split(LINE_PATTERN).length;
}

async function trackedFiles(repoRoot: string): Promise<string[]> {
	const { stdout } = await execFileAsync("git", [
		"-C",
		repoRoot,
		"ls-files",
		"--cached",
	]);
	return stdout
		.split("\n")
		.filter(Boolean)
		.map((file) => file.replaceAll("\\", "/"));
}
