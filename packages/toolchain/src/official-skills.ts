export interface OfficialSkillCatalogEntry {
	id: string;
	publisher: string;
	name: string;
	category: OfficialSkillCategory;
	sourceStatus: "official" | "community";
	repo: string;
	skill: string;
	pathOnly?: boolean;
	sourceUrl: string;
	description: string;
}

export const OFFICIAL_SKILL_CATEGORIES = [
	"infrastructure",
	"development",
	"ai-tools",
	"ai-agents",
	"workflows",
	"security",
	"data",
	"design",
	"docs",
	"test-behavior",
] as const;
export const OFFICIAL_SKILLS_BASE_URL = "https://officialskills.sh";
export const OFFICIAL_SKILLS_HOSTNAME = new URL(OFFICIAL_SKILLS_BASE_URL)
	.hostname;

export type OfficialSkillCategory = (typeof OFFICIAL_SKILL_CATEGORIES)[number];

export type OfficialSkillId = (typeof OFFICIAL_SKILL_CATALOG)[number]["id"];

export const OFFICIAL_SKILL_INSTALL_COMMAND_PATTERN =
	/(?:npx|bunx)\s+skills\s+add\s+(https:\/\/github\.com\/[^\s"'`<]+)\s+--skill\s+([A-Za-z0-9._-]+)/;
export const OFFICIAL_SKILL_ADD_COMMAND_PATTERN =
	/\bbunx\s+skills\s+add\b.*\s+--skill\s+(.+?)(?:\s+--(?:global|yes)\b|\s+-[gy]\b|$)/;
export const OFFICIAL_SKILL_PATH_COMMAND_PATTERN =
	/\bbunx\s+skills\s+add\b.*\/(?:skills|plugins)\/([A-Za-z0-9._-]+)(?:\s+--(?:global|yes)\b|\s+-[gy]\b|$)/;
const COMMUNITY_STATUS_PATTERN = /\bcommunity\b/i;
const TITLE_CASE_SPLIT_PATTERN = /[-_]/;

function officialSkillsUrl(path: string): string {
	return `${OFFICIAL_SKILLS_BASE_URL}${path}`;
}

export const OFFICIAL_SKILL_CATALOG = [
	{
		id: "skill-openai-gh-fix-ci",
		publisher: "OpenAI",
		name: "gh-fix-ci",
		category: "workflows",
		sourceStatus: "official",
		repo: "https://github.com/openai/skills",
		skill: "gh-fix-ci",
		sourceUrl: officialSkillsUrl("/openai/skills/gh-fix-ci"),
		description:
			"Debug failing GitHub Actions checks on a PR with the GitHub CLI.",
	},
	{
		id: "skill-openai-gh-address-comments",
		publisher: "OpenAI",
		name: "gh-address-comments",
		category: "workflows",
		sourceStatus: "official",
		repo: "https://github.com/openai/skills",
		skill: "gh-address-comments",
		sourceUrl: officialSkillsUrl("/openai/skills/gh-address-comments"),
		description:
			"Read PR comments and review-changes threads with the GitHub CLI, then address selected feedback.",
	},
	{
		id: "skill-openai-yeet",
		publisher: "OpenAI",
		name: "yeet",
		category: "workflows",
		sourceStatus: "official",
		repo: "https://github.com/openai/skills",
		skill: "yeet",
		sourceUrl: officialSkillsUrl("/openai/skills/yeet"),
		description:
			"Automate the GitHub branch, commit, push, and pull request workflow.",
	},
	{
		id: "skill-openai-playwright",
		publisher: "OpenAI",
		name: "playwright",
		category: "test-behavior",
		sourceStatus: "community",
		repo: "https://github.com/openai/skills",
		skill: "playwright",
		sourceUrl: officialSkillsUrl("/openai/skills/playwright"),
		description:
			"Automate a real browser from the terminal using playwright-cli.",
	},
	{
		id: "skill-trailofbits-audit-context-building",
		publisher: "Trail of Bits",
		name: "audit-context-building",
		category: "security",
		sourceStatus: "official",
		repo: "https://github.com/trailofbits/skills",
		skill: "audit-context-building",
		sourceUrl: officialSkillsUrl("/trailofbits/skills/audit-context-building"),
		description:
			"Build a structured pre-audit model of functions, invariants, and trust boundaries.",
	},
	{
		id: "skill-trailofbits-differential-review",
		publisher: "Trail of Bits",
		name: "differential-review",
		category: "security",
		sourceStatus: "official",
		repo: "https://github.com/trailofbits/skills",
		skill: "differential-review",
		sourceUrl: officialSkillsUrl("/trailofbits/skills/differential-review"),
		description:
			"Run security-focused differential reviews on PRs, commits, and diffs.",
	},
	{
		id: "skill-trailofbits-static-analysis",
		publisher: "Trail of Bits",
		name: "static-analysis",
		category: "security",
		sourceStatus: "official",
		repo: "https://github.com/trailofbits/skills/tree/main/plugins/static-analysis",
		skill: "static-analysis",
		pathOnly: true,
		sourceUrl: officialSkillsUrl("/trailofbits/skills/static-analysis"),
		description:
			"Use CodeQL, Semgrep, and SARIF parsing for security vulnerability detection.",
	},
	{
		id: "skill-trailofbits-testing-handbook-skills",
		publisher: "Trail of Bits",
		name: "testing-handbook-skills",
		category: "security",
		sourceStatus: "official",
		repo: "https://github.com/trailofbits/skills",
		skill: "testing-handbook-skills",
		sourceUrl: officialSkillsUrl("/trailofbits/skills/testing-handbook-skills"),
		description:
			"Generate application security testing skills from the Trail of Bits handbook.",
	},
	{
		id: "skill-getsentry-sentry-workflow",
		publisher: "Sentry",
		name: "sentry-workflow",
		category: "workflows",
		sourceStatus: "official",
		repo: "https://github.com/getsentry/sentry-for-ai",
		skill: "sentry-workflow",
		sourceUrl: officialSkillsUrl("/getsentry/skills/sentry-workflow"),
		description:
			"Fix production issues and review-changes code with Sentry context in one workflow.",
	},
	{
		id: "skill-anthropics-mcp-builder",
		publisher: "Anthropic",
		name: "mcp-builder",
		category: "ai-tools",
		sourceStatus: "official",
		repo: "https://github.com/anthropics/skills",
		skill: "mcp-builder",
		sourceUrl: officialSkillsUrl("/anthropics/skills/mcp-builder"),
		description:
			"Build MCP servers that connect LLMs to external APIs and services.",
	},
] as const satisfies OfficialSkillCatalogEntry[];

export function officialSkillById(
	id: string,
): OfficialSkillCatalogEntry | undefined {
	return OFFICIAL_SKILL_CATALOG.find((entry) => entry.id === id);
}

export function officialSkillIds(): OfficialSkillId[] {
	return OFFICIAL_SKILL_CATALOG.map((entry) => entry.id);
}

export function parseOfficialSkillPage(
	html: string,
	sourceUrl: string,
): OfficialSkillCatalogEntry | undefined {
	const install = html.match(OFFICIAL_SKILL_INSTALL_COMMAND_PATTERN);
	if (!install) return undefined;
	const path = new URL(sourceUrl).pathname.split("/").filter(Boolean);
	const owner = path[0] ?? "external";
	const publisher = titleCase(owner);
	const name = path[2] ?? install[2];
	return {
		id: officialSkillId(owner, install[2]),
		publisher,
		name,
		category: categoryFromHtml(html),
		sourceStatus: sourceStatusFromHtml(html),
		repo: install[1],
		skill: install[2],
		sourceUrl,
		description: firstParagraph(html) ?? `${publisher} ${name} skill.`,
	};
}

function officialSkillId(owner: string, skill: string): string {
	return `skill-${slugPart(owner)}-${slugPart(skill)}`;
}

function slugPart(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function sourceStatusFromHtml(
	html: string,
): OfficialSkillCatalogEntry["sourceStatus"] {
	return COMMUNITY_STATUS_PATTERN.test(html) ? "community" : "official";
}

export function officialSkillLinks(html: string): string[] {
	const links = new Set<string>();
	for (const match of html.matchAll(/href="(\/[^"]+\/skills\/[^"#?]+)"/g))
		links.add(officialSkillsUrl(match[1]));
	return [...links].sort();
}

export function officialSkillBundleLinks(
	html: string,
	sourceUrl: string,
): string[] {
	const links = new Set<string>();
	for (const match of html.matchAll(/(?:href|src)="([^"]+\.js)"/g)) {
		const url = new URL(match[1], sourceUrl);
		if (
			url.hostname === OFFICIAL_SKILLS_HOSTNAME &&
			url.pathname.startsWith("/assets/")
		)
			links.add(url.toString());
	}
	return [...links].sort();
}

export function officialSkillCategoryMap(
	javascript: string,
): Map<string, OfficialSkillCategory> {
	const categories = new Map<string, OfficialSkillCategory>();
	const recordPattern =
		/\{slug:"([^"]+)",name:"[^"]+",description:"(?:\\.|[^"\\])*",owner:"[^"]+",category:"([^"]+)"/g;
	for (const match of javascript.matchAll(recordPattern)) {
		const category = match[2] as OfficialSkillCategory;
		if (OFFICIAL_SKILL_CATEGORIES.includes(category))
			categories.set(match[1], category);
	}
	return categories;
}

function categoryFromHtml(html: string): OfficialSkillCatalogEntry["category"] {
	for (const category of OFFICIAL_SKILL_CATEGORIES) {
		if (html.includes(category)) return category;
	}
	return "development";
}

function firstParagraph(html: string): string | undefined {
	const text = html
		.replace(/<script[\s\S]*?<\/script>/g, " ")
		.replace(/<style[\s\S]*?<\/style>/g, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	const installIndex = text.indexOf("Setup & Installation");
	const candidate = installIndex >= 0 ? text.slice(0, installIndex) : text;
	const titleIndex = candidate.lastIndexOf("What This Skill Does");
	const description = titleIndex >= 0 ? candidate.slice(titleIndex) : candidate;
	return description.slice(0, 220).trim() || undefined;
}

function titleCase(value: string): string {
	const acronyms: Record<string, string> = { openai: "OpenAI" };
	if (acronyms[value]) return acronyms[value];
	return value
		.split(TITLE_CASE_SPLIT_PATTERN)
		.filter(Boolean)
		.map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
		.join(" ");
}
