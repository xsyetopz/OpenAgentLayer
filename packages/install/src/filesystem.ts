import { readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function readExistingText(
	path: string,
): Promise<string | undefined> {
	const file = Bun.file(path);
	return (await file.exists()) ? await file.text() : undefined;
}

export async function removeEmptyManagedParents(
	targetRoot: string,
	relativeDirectory: string,
): Promise<void> {
	let current = relativeDirectory;
	while (current !== "." && current !== "") {
		const absolute = join(targetRoot, current);
		if (!(await isDirectoryEmpty(absolute))) {
			return;
		}
		await rm(absolute, { force: true, recursive: true });
		current = dirname(current);
	}
}

async function isDirectoryEmpty(path: string): Promise<boolean> {
	try {
		const entries = await readdir(path);
		return entries.length === 0;
	} catch (error) {
		return isNotFoundError(error);
	}
}

export function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
