import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
export const repoRoot = resolve(dirname(currentFile), "../../..");
export const harnessRoot = resolve(repoRoot, "source/harness");

export function repoPath(path) {
	return resolve(repoRoot, path);
}
