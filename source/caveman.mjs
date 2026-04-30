export const DEFAULT_CAVEMAN_MODE = "full";

export const CAVEMAN_MODES = [
	"off",
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan",
	"wenyan-ultra",
];

export const CAVEMAN_MODE_ALIASES = {
	"wenyan-full": "wenyan",
	normal: "off",
};

export const CAVEMAN_UPSTREAM = {
	repo: "https://github.com/JuliusBrussee/caveman",
	ref: "13f0d4c49a87b4286b26b919b455a8625a0433d0",
	pinnedAt: "2026-04-21T12:23:31.540Z",
	files: ["README.md", ".codex/hooks.json", ".github/copilot-instructions.md"],
	sourcePath: "third_party/caveman",
};

export const CAVEMAN_ALWAYS_ON_SNIPPET = [
	"Terse like caveman.",
	"Technical substance exact. Only fluff die.",
	"Drop: articles, filler (just/really/basically), pleasantries, hedging.",
	"Fragments OK. Short synonyms OK.",
	"Code unchanged.",
	"Pattern: [thing] [action] [reason]. [next step].",
	"ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift.",
	'Code/commits/PRs: normal. Off: "stop caveman" / "normal mode".',
].join(" ");

export const CAVEMAN_RULE_LINES = [
	"Terse like caveman. Technical substance exact. Only fluff die.",
	"Drop articles, filler, pleasantries, hedging, and emotional mirroring.",
	"Fragments OK. Short synonyms OK. Keep technical terms exact.",
	"Pattern: [thing] [action] [reason]. [next step].",
	"Active every response while mode stays on. No filler drift after many turns.",
];

export const CAVEMAN_PROTECTED_SURFACE_LINE =
	"Code, commands, paths, URLs, inline code, fenced code, exact errors, commit messages, review findings, docs, comments, and file contents stay normal unless the matching explicit Caveman skill was invoked.";

export const CAVEMAN_CLARITY_OVERRIDE_LINE =
	"Temporarily answer normally for security warnings, destructive confirmations, and ambiguity-sensitive instructions or repeated user confusion.";

export const CAVEMAN_DRIFT_PATTERNS = [
	{
		label: "sycophantic opener",
		pattern:
			"(?:^|\\n)\\s*(?:sure|of course|absolutely|certainly|great question|good point|happy to)\\b",
		flags: "i",
	},
	{
		label: "optional-offer footer",
		pattern:
			"(?:let me know if|feel free to|if you(?:'|’)d like|happy to help)\\b",
		flags: "i",
	},
	{
		label: "AI filler",
		pattern:
			"\\b(?:robust|seamless|comprehensive|leverage|utilize|delve|moving forward)\\b",
		flags: "i",
	},
];

// Back-compat alias for existing imports in generated/runtime surfaces.
export const CAVEMAN_VIOLATION_RULES = CAVEMAN_DRIFT_PATTERNS;

export function matchCavemanViolations(text = "") {
	const content = String(text || "").trim();
	if (!content) return [];
	const hits = [];
	for (const rule of CAVEMAN_DRIFT_PATTERNS) {
		const regex = new RegExp(rule.pattern, rule.flags);
		const match = content.match(regex);
		if (match) hits.push(`${rule.label}: ${match[0].trim().slice(0, 80)}`);
	}
	return hits;
}

export const CAVEMAN_MODE_GUIDANCE = {
	lite: "professional but tight; full sentences still OK",
	full: "classic caveman terseness; fragments OK",
	ultra: "maximum compression; abbreviations and arrows OK",
	"wenyan-lite": "semi-classical terseness while still readable",
	wenyan: "strong classical terseness",
	"wenyan-ultra": "maximum classical compression while preserving meaning",
};

export function resolveCavemanMode(value = "") {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (!normalized) return "";
	if (CAVEMAN_MODES.includes(normalized)) return normalized;
	return CAVEMAN_MODE_ALIASES[normalized] ?? "";
}

export function formatCavemanRuleBulletLines() {
	return [
		...CAVEMAN_RULE_LINES.map((line) => `- ${line}`),
		`- ${CAVEMAN_PROTECTED_SURFACE_LINE}`,
		`- ${CAVEMAN_CLARITY_OVERRIDE_LINE}`,
	].join("\n");
}

export function renderManagedCavemanContext(mode = DEFAULT_CAVEMAN_MODE) {
	const normalized = resolveCavemanMode(mode) || DEFAULT_CAVEMAN_MODE;
	if (normalized === "off") return "";
	return [
		`OPENAGENTSBTW_CAVEMAN_MODE=${normalized}`,
		`Caveman mode active (${normalized}).`,
		...CAVEMAN_RULE_LINES,
		CAVEMAN_PROTECTED_SURFACE_LINE,
		CAVEMAN_CLARITY_OVERRIDE_LINE,
	].join("\n");
}

export function renderCavemanPromptBullet(
	prefix = "If Caveman mode is active",
) {
	return `${prefix}: ${CAVEMAN_RULE_LINES[0]} ${CAVEMAN_RULE_LINES[1]} ${CAVEMAN_RULE_LINES[2]} ${CAVEMAN_RULE_LINES[3]} ${CAVEMAN_RULE_LINES[4]} ${CAVEMAN_PROTECTED_SURFACE_LINE} ${CAVEMAN_CLARITY_OVERRIDE_LINE}`;
}

export function renderCavemanSkillBoundaries() {
	return [
		"- Caveman changes assistant prose only.",
		"- Keep technical terms exact. Fragments and short synonyms are OK.",
		`- ${CAVEMAN_PROTECTED_SURFACE_LINE}`,
		"- Active every response while enabled. No filler drift after long sessions.",
		`- ${CAVEMAN_CLARITY_OVERRIDE_LINE}`,
	].join("\n");
}

export function renderCavemanRuntimeModule() {
	return `export const DEFAULT_CAVEMAN_MODE = ${JSON.stringify(DEFAULT_CAVEMAN_MODE)};

const CAVEMAN_MODES = ${JSON.stringify(CAVEMAN_MODES, null, 2)};
const CAVEMAN_MODE_ALIASES = ${JSON.stringify(CAVEMAN_MODE_ALIASES, null, 2)};
const CAVEMAN_RULE_LINES = ${JSON.stringify(CAVEMAN_RULE_LINES, null, 2)};
const CAVEMAN_PROTECTED_SURFACE_LINE = ${JSON.stringify(CAVEMAN_PROTECTED_SURFACE_LINE)};
const CAVEMAN_CLARITY_OVERRIDE_LINE = ${JSON.stringify(CAVEMAN_CLARITY_OVERRIDE_LINE)};
const CAVEMAN_DRIFT_PATTERNS = ${JSON.stringify(CAVEMAN_DRIFT_PATTERNS, null, 2)};

export function resolveCavemanMode(value = "") {
\tconst normalized = String(value || "")
\t\t.trim()
\t\t.toLowerCase();
\tif (!normalized) return "";
\tif (CAVEMAN_MODES.includes(normalized)) return normalized;
\treturn CAVEMAN_MODE_ALIASES[normalized] ?? "";
}

export function renderManagedCavemanContext(mode = DEFAULT_CAVEMAN_MODE) {
\tconst normalized = resolveCavemanMode(mode) || DEFAULT_CAVEMAN_MODE;
\tif (normalized === "off") return "";
\treturn [
\t\t\`OPENAGENTSBTW_CAVEMAN_MODE=\${normalized}\`,
\t\t\`Caveman mode active (\${normalized}).\`,
\t\t...CAVEMAN_RULE_LINES,
\t\tCAVEMAN_PROTECTED_SURFACE_LINE,
\t\tCAVEMAN_CLARITY_OVERRIDE_LINE,
\t].join("\\n");
}

export function matchCavemanViolations(text = "") {
\tconst content = String(text || "").trim();
\tif (!content) return [];
\tconst hits = [];
\tfor (const rule of CAVEMAN_DRIFT_PATTERNS) {
\t\tconst regex = new RegExp(rule.pattern, rule.flags);
\t\tconst match = content.match(regex);
\t\tif (match) hits.push(\`\${rule.label}: \${match[0].trim().slice(0, 80)}\`);
\t}
\treturn hits;
}
`;
}
