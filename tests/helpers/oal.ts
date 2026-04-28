import {
	cpSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const repoRoot = process.cwd();

export function tempRepo(): string {
	const root = join(tmpdir(), `oal-test-${crypto.randomUUID()}`);
	mkdirSync(root, { recursive: true });
	cpSync(resolve(repoRoot, "source"), resolve(root, "source"), {
		recursive: true,
	});
	cpSync(resolve(repoRoot, "docs/research"), resolve(root, "docs/research"), {
		recursive: true,
	});
	return root;
}

export function withTempRepo(run: (root: string) => void): void {
	const root = tempRepo();
	try {
		run(root);
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
}

export function mutateJson(
	root: string,
	path: string,
	mutate: (value: Record<string, unknown>) => void,
): void {
	const fullPath = resolve(root, path);
	const value = JSON.parse(readFileSync(fullPath, "utf8")) as Record<
		string,
		unknown
	>;
	mutate(value);
	writeFileSync(fullPath, `${JSON.stringify(value, null, "\t")}\n`);
}

export function insertBefore(
	root: string,
	path: string,
	marker: string,
	text: string,
): void {
	const fullPath = resolve(root, path);
	const content = readFileSync(fullPath, "utf8");
	writeFileSync(fullPath, content.replace(marker, `${text}${marker}`));
}
