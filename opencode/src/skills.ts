import { join } from "node:path";
import { glob } from "glob";
import type { SkillDefinition } from "./types.ts";

const SKILLS_DIR = join(import.meta.dir, "..", "templates", "skills");

const HEADING_REGEX = /^#+\s*/;

type FrontmatterResult = {
	name: string;
	description: string;
	version: string;
	body: string;
};

function extractFrontmatterValue(
	frontmatter: string,
	key: string,
	fallback = "",
): string {
	for (const line of frontmatter.split("\n")) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) {
			continue;
		}
		const k = line.slice(0, colonIdx).trim();
		if (k === key) {
			return line.slice(colonIdx + 1).trim();
		}
	}
	return fallback;
}

function parseFrontmatter(content: string): FrontmatterResult {
	if (!content.startsWith("---")) {
		return {
			name: "",
			description: "",
			version: "1.0",
			body: content,
		};
	}

	const endIdx = content.indexOf("---", 3);
	if (endIdx === -1) {
		return {
			name: "",
			description: "",
			version: "1.0",
			body: content,
		};
	}

	const frontmatter = content.slice(3, endIdx).trim();
	const body = content.slice(endIdx + 3).trimStart();

	return {
		name: extractFrontmatterValue(frontmatter, "name", ""),
		description: extractFrontmatterValue(frontmatter, "description", ""),
		version: extractFrontmatterValue(frontmatter, "version", "1.0"),
		body,
	};
}

function getDirName(path: string): string {
	const dir = path.slice(0, path.lastIndexOf("/"));
	return dir.slice(dir.lastIndexOf("/") + 1);
}

function getDefaultDescription(
	parsed: FrontmatterResult,
	content: string,
	dirName: string,
): string {
	return (
		parsed.description ||
		content.split("\n")[0]?.replace(HEADING_REGEX, "").trim() ||
		`${parsed.name || dirName} skill`
	);
}

export async function loadSkillsFromDisk(): Promise<SkillDefinition[]> {
	const skillPaths = await glob(`${SKILLS_DIR}/*/SKILL.md`);
	const skills: SkillDefinition[] = [];

	for (const skillPath of skillPaths) {
		const dirName = getDirName(skillPath);
		const file = Bun.file(skillPath);
		if (!(await file.exists())) {
			continue;
		}

		const content = await file.text();
		const parsed = parseFrontmatter(content);

		skills.push({
			name: parsed.name || dirName,
			description: getDefaultDescription(parsed, content, dirName),
			version: parsed.version,
			content: parsed.body,
		});
	}

	return skills;
}

export type { SkillDefinition };
