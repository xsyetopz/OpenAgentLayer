export interface OfficialSkillCatalogEntry {
	id: string;
	publisher: string;
	name: string;
	category:
		| "design"
		| "development"
		| "security"
		| "testing"
		| "infrastructure";
	sourceStatus: "official" | "community";
	repo: string;
	skill: string;
	sourceUrl: string;
	description: string;
}

export type OfficialSkillId =
	| "skill-frontend-design"
	| "skill-webapp-testing"
	| "skill-security-best-practices"
	| "skill-react-best-practices"
	| "skill-stripe-best-practices"
	| "skill-workers-best-practices";

const INSTALL_COMMAND_PATTERN =
	/(?:npx|bunx)\s+skills\s+add\s+(https:\/\/github\.com\/[^\s"'`<]+)\s+--skill\s+([A-Za-z0-9._-]+)/;
const COMMUNITY_STATUS_PATTERN = /\bcommunity\b/i;
const TITLE_CASE_SPLIT_PATTERN = /[-_]/;

export const OFFICIAL_SKILL_CATALOG: OfficialSkillCatalogEntry[] = [
	{
		id: "skill-frontend-design",
		publisher: "Anthropic",
		name: "frontend-design",
		category: "design",
		sourceStatus: "official",
		repo: "https://github.com/anthropics/skills",
		skill: "frontend-design",
		sourceUrl: "https://officialskills.sh/anthropics/skills/frontend-design",
		description:
			"Intentional frontend aesthetics and interface implementation.",
	},
	{
		id: "skill-webapp-testing",
		publisher: "Anthropic",
		name: "webapp-testing",
		category: "testing",
		sourceStatus: "official",
		repo: "https://github.com/anthropics/skills",
		skill: "webapp-testing",
		sourceUrl: "https://officialskills.sh/anthropics/skills/webapp-testing",
		description: "Local web application testing with browser automation.",
	},
	{
		id: "skill-security-best-practices",
		publisher: "OpenAI",
		name: "security-best-practices",
		category: "security",
		sourceStatus: "community",
		repo: "https://github.com/openai/skills",
		skill: "security-best-practices",
		sourceUrl:
			"https://officialskills.sh/openai/skills/security-best-practices",
		description: "Security review for Python, JavaScript, TypeScript, and Go.",
	},
	{
		id: "skill-react-best-practices",
		publisher: "Vercel",
		name: "react-best-practices",
		category: "development",
		sourceStatus: "official",
		repo: "https://github.com/vercel-labs/next-skills",
		skill: "react-best-practices",
		sourceUrl:
			"https://officialskills.sh/vercel-labs/skills/react-best-practices",
		description: "React and Next.js performance practices.",
	},
	{
		id: "skill-stripe-best-practices",
		publisher: "Stripe",
		name: "stripe-best-practices",
		category: "development",
		sourceStatus: "official",
		repo: "https://github.com/stripe/ai",
		skill: "stripe-best-practices",
		sourceUrl: "https://officialskills.sh/stripe/skills/stripe-best-practices",
		description: "Stripe integration and API decision guidance.",
	},
	{
		id: "skill-workers-best-practices",
		publisher: "Cloudflare",
		name: "workers-best-practices",
		category: "infrastructure",
		sourceStatus: "official",
		repo: "https://github.com/cloudflare/skills",
		skill: "workers-best-practices",
		sourceUrl:
			"https://officialskills.sh/cloudflare/skills/workers-best-practices",
		description: "Cloudflare Workers production patterns.",
	},
];

export function officialSkillById(
	id: string,
): OfficialSkillCatalogEntry | undefined {
	return OFFICIAL_SKILL_CATALOG.find((entry) => entry.id === id);
}

export function officialSkillIds(): OfficialSkillId[] {
	return OFFICIAL_SKILL_CATALOG.map((entry) => entry.id as OfficialSkillId);
}

export function parseOfficialSkillPage(
	html: string,
	sourceUrl: string,
): OfficialSkillCatalogEntry | undefined {
	const install = html.match(INSTALL_COMMAND_PATTERN);
	if (!install) return undefined;
	const path = new URL(sourceUrl).pathname.split("/").filter(Boolean);
	const publisher = titleCase(path[0] ?? "External");
	const name = path[2] ?? install[2];
	return {
		id: `skill-${install[2]}`,
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

function sourceStatusFromHtml(
	html: string,
): OfficialSkillCatalogEntry["sourceStatus"] {
	return COMMUNITY_STATUS_PATTERN.test(html) ? "community" : "official";
}

export function officialSkillLinks(html: string): string[] {
	const links = new Set<string>();
	for (const match of html.matchAll(/href="(\/[^"]+\/skills\/[^"#?]+)"/g))
		links.add(`https://officialskills.sh${match[1]}`);
	return [...links].sort();
}

function categoryFromHtml(html: string): OfficialSkillCatalogEntry["category"] {
	for (const category of [
		"design",
		"security",
		"testing",
		"infrastructure",
		"development",
	] as const) {
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
