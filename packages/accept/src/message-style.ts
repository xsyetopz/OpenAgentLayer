import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MESSAGE_FILE_PATTERN = /\.(ts|mjs|json)$/;
const TERMINAL_PERIOD_PATTERNS = [
	/reason:\s*"[^"\n]*\."/,
	/message:\s*"[^"\n]*\."/,
	/feedback:\s*"[^"\n]*\."/,
	/description:\s*"[^"\n]*\."/,
	/throw new Error\("[^"\n]*\."\)/,
] as const;

export async function assertMessageStyle(repoRoot: string): Promise<void> {
	for (const path of await trackedFiles(repoRoot)) {
		if (!MESSAGE_FILE_PATTERN.test(path)) continue;
		const content = await readTrackedWorktreeFile(repoRoot, path);
		if (content === undefined) continue;
		for (const pattern of TERMINAL_PERIOD_PATTERNS)
			if (pattern.test(content))
				throw new Error(
					`Message style uses terminal period in \`${path}\` for \`${pattern.source}\``,
				);
	}
}

async function readTrackedWorktreeFile(
	repoRoot: string,
	path: string,
): Promise<string | undefined> {
	try {
		return await readFile(join(repoRoot, path), "utf8");
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "ENOENT"
		)
			return undefined;
		throw error;
	}
}

async function trackedFiles(repoRoot: string): Promise<string[]> {
	const { stdout } = await execFileAsync("git", ["-C", repoRoot, "ls-files"]);
	return stdout.split("\n").filter(Boolean);
}
