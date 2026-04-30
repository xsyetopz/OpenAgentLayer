export interface FrontmatterValueMap {
	readonly [key: string]:
		| string
		| boolean
		| number
		| readonly string[]
		| undefined;
}

export function renderMarkdownWithFrontmatter(
	frontmatter: FrontmatterValueMap,
	body: string,
): string {
	const lines = ["---"];
	for (const key of Object.keys(frontmatter).sort()) {
		const value = frontmatter[key];
		if (value === undefined) {
			continue;
		}
		lines.push(`${key}: ${renderFrontmatterValue(value)}`);
	}
	lines.push("---", "", body.trimEnd(), "");
	return lines.join("\n");
}

export function appendSection(title: string, body: string): string {
	return `\n## ${title}\n\n${body.trim()}\n`;
}

function renderFrontmatterValue(
	value: string | boolean | number | readonly string[],
): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
	}
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	return String(value);
}
