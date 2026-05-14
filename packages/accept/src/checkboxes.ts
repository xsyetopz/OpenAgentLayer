import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CHECKED_CHECKBOX_LINE_PATTERN } from "./patterns";

export async function assertCheckboxDiscipline(
	repoRoot: string,
): Promise<void> {
	for (const file of ["PLAN.md", "ROADMAP.md"]) {
		const content = await readOptionalFile(join(repoRoot, file));
		if (!content) continue;
		const checked = content.match(CHECKED_CHECKBOX_LINE_PATTERN) ?? [];
		if (checked.length > 0 && !content.includes("STATUS: PASS")) {
			throw new Error(
				`${file} contains checked boxes without STATUS: PASS evidence sign-off.`,
			);
		}
	}
}

async function readOptionalFile(path: string): Promise<string | undefined> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (error && typeof error === "object" && "code" in error)
			if ((error as { code?: string }).code === "ENOENT") return undefined;
		throw error;
	}
}
