import { expect, test } from "bun:test";
import { WHITESPACE_SPLIT_PATTERN } from "@openagentlayer/source";
import {
	context7ApiKeyStatus,
	OFFICIAL_SKILLS_BASE_URL,
	officialSkillBundleLinks,
	officialSkillCategoryMap,
	officialSkillLinks,
	optionalFeatureCommands,
	parseOfficialSkillPage,
	planToolchainInstall,
	renderToolchainPlan,
} from "../src";

const VALID_CONTEXT7_API_KEY = ["ctx7sk", "abcdefghijklmnop"].join("-");
const OFFICIAL_SKILLS_CATALOG_URL = `${OFFICIAL_SKILLS_BASE_URL}/`;

function officialSkillSourceUrl(owner: string, skill: string): string {
	return `${OFFICIAL_SKILLS_BASE_URL}/${owner}/skills/${skill}`;
}

test("macOS plan installs Homebrew before core tools when missing", () => {
	const plan = planToolchainInstall({ os: "macos", hasHomebrew: false });
	expect(plan.packageManager).toBe("brew");
	expect(plan.commands[0]).toContain("Homebrew/install");
	expect(plan.commands[1]).toContain("bun.sh/install");
	const brewCommand = plan.commands.find((command) =>
		command.startsWith("brew install "),
	);
	expect(brewCommand?.split(WHITESPACE_SPLIT_PATTERN)).toContain("ripgrep");
	expect(brewCommand?.split(WHITESPACE_SPLIT_PATTERN)).not.toContain("bun");
	expect(plan.requiredTools).toContain("bun");
	expect(plan.requiredTools).toContain("shellcheck");
	expect(plan.requiredTools).toContain("shfmt");
	expect(plan.requiredTools).toContain("ast-grep");
	expect(plan.requiredTools).toContain("gitleaks");
	expect(plan.requiredTools).toContain("watchexec");
	expect(plan.commands).toContain("rtk gain");
	expect(plan.commands).toContain("rtk init -g --auto-patch");
	expect(plan.commands).toContain("rtk init -g --codex");
	expect(plan.commands).toContain("rtk init -g --opencode");
	expect(plan.commands).toContain("rtk grep --help");
	expect(plan.commands).toContain("rtk read --help");
	expect(plan.commands).toContain("rtk find --help");
	expect(plan.commands).toContain("rg --help");
	expect(plan.commands).toContain("fd --help");
	expect(renderToolchainPlan(plan)).toContain("confirm token savings");
	expect(renderToolchainPlan(plan)).toContain("at or above 80%");
	expect(renderToolchainPlan(plan)).toContain(
		"RTK flags are not raw tool flags",
	);
	expect(renderToolchainPlan(plan)).toContain("RTK options are exhausted");
	expect(renderToolchainPlan(plan)).toContain("respect `.gitignore`");
	expect(renderToolchainPlan(plan)).toContain("tracked files only");
	expect(renderToolchainPlan(plan)).toContain("shellcheck");
});

test("Linux plan uses selected distro package manager and optional tools", () => {
	const plan = planToolchainInstall({
		os: "linux",
		packageManager: "dnf",
		includeOptional: ["ctx7", "playwright"],
	});
	expect(plan.commands[0]).toBe("sudo dnf check-update || true");
	expect(renderToolchainPlan(plan)).toContain(
		"ctx7 setup --cli --yes --codex --claude --opencode",
	);
	expect(renderToolchainPlan(plan)).toContain("bun install -g ctx7");
	expect(renderToolchainPlan(plan)).toContain("ctx7 --version");
	expect(renderToolchainPlan(plan)).toContain("https://context7.com/dashboard");
	expect(renderToolchainPlan(plan)).toContain(
		"bunx -p playwright playwright install --with-deps",
	);
	expect(renderToolchainPlan(plan)).toContain("```bash");
	expect(renderToolchainPlan(plan)).not.toContain("- bunx");
});

test("optional feature commands support install and removal", () => {
	expect(optionalFeatureCommands("install", ["ctx7", "playwright"])).toEqual([
		"ctx7 setup --cli --yes --codex --claude --opencode",
		"bunx -p playwright playwright install --with-deps",
	]);
	expect(optionalFeatureCommands("remove", ["ctx7", "playwright"])).toEqual([
		"ctx7 remove --cli --yes --codex --claude --opencode",
		"bunx -p playwright playwright uninstall --all",
	]);
	expect(
		optionalFeatureCommands("install", ["ctx7"], {
			providers: ["codex", "opencode"],
			scope: "project",
		}),
	).toEqual(["ctx7 setup --cli --yes --codex --opencode --project"]);
	expect(
		optionalFeatureCommands("install", [
			"skill-openai-gh-fix-ci",
			"skill-trailofbits-static-analysis",
		]),
	).toEqual([
		"bunx skills add https://github.com/openai/skills --skill gh-fix-ci --yes --global",
		"bunx skills add https://github.com/trailofbits/skills/tree/main/plugins/static-analysis --yes --global",
	]);
	expect(
		optionalFeatureCommands("remove", [
			"skill-openai-gh-fix-ci",
			"skill-trailofbits-static-analysis",
		]),
	).toEqual([
		"bunx skills remove gh-fix-ci --yes --global",
		"bunx skills remove static-analysis --yes --global",
	]);
});

test("Playwright optional setup only installs browser dependencies", () => {
	expect(
		optionalFeatureCommands("install", ["playwright"], {
			providers: ["codex", "opencode"],
			repoRoot: "/repo",
			targetRoot: "/target",
		}),
	).toEqual(["bunx -p playwright playwright install --with-deps"]);
	expect(optionalFeatureCommands("install", ["playwright"])).toEqual([
		"bunx -p playwright playwright install --with-deps",
	]);
	expect(
		optionalFeatureCommands("install", ["playwright"]).join("\n"),
	).not.toContain("submodule");
});

test("Context7 API key status detects expected key format", () => {
	expect(context7ApiKeyStatus({})).toEqual({ present: false, valid: false });
	expect(
		context7ApiKeyStatus({
			CONTEXT7_API_KEY: VALID_CONTEXT7_API_KEY,
		}),
	).toEqual({ present: true, valid: true, source: "CONTEXT7_API_KEY" });
	expect(context7ApiKeyStatus({ CONTEXT7_API_KEY: "not-a-key" })).toEqual({
		present: true,
		valid: false,
		source: "CONTEXT7_API_KEY",
	});
});

test("officialskills frontend pages can generate catalog entries", () => {
	const html = `
		<h1>security-best-practices</h1>
		community security
		<p>Reviews Python and TypeScript codebases.</p>
		<p>bunx skills add https://github.com/openai/skills --skill security-best-practices</p>
		<a href="/openai/skills/security-best-practices">OpenAI</a>
	`;
	expect(officialSkillLinks(html)).toEqual([
		officialSkillSourceUrl("openai", "security-best-practices"),
	]);
	expect(
		parseOfficialSkillPage(
			html,
			officialSkillSourceUrl("openai", "security-best-practices"),
		),
	).toMatchObject({
		id: "skill-openai-security-best-practices",
		publisher: "OpenAI",
		name: "security-best-practices",
		category: "security",
		sourceStatus: "community",
		repo: "https://github.com/openai/skills",
		skill: "security-best-practices",
	});
});

test("officialskills parsed ids include owner to avoid duplicate prompt values", () => {
	const first = parseOfficialSkillPage(
		"<p>bunx skills add https://github.com/acme/skills --skill bug-debug</p>",
		officialSkillSourceUrl("acme", "bug-debug"),
	);
	const second = parseOfficialSkillPage(
		"<p>bunx skills add https://github.com/example/skills --skill bug-debug</p>",
		officialSkillSourceUrl("example", "bug-debug"),
	);
	expect(first?.id).toBe("skill-acme-bug-debug");
	expect(second?.id).toBe("skill-example-bug-debug");
});

test("officialskills frontend bundles expose website tab categories", () => {
	const html = '<script src="/assets/main.js"></script>';
	expect(officialSkillBundleLinks(html, OFFICIAL_SKILLS_CATALOG_URL)).toEqual([
		`${OFFICIAL_SKILLS_BASE_URL}/assets/main.js`,
	]);
	const categories = officialSkillCategoryMap(
		'{slug:"openai/security-best-practices",name:"security-best-practices",description:"Review code",owner:"openai",category:"security",localMarkdownPath:"/skills-markdown/openai/security-best-practices.md"}',
	);
	expect(categories.get("openai/security-best-practices")).toBe("security");
});

test("official skill catalog preserves descriptive sentences", () => {
	const catalog = planToolchainInstall({
		os: "linux",
		includeOptional: ["skill-trailofbits-static-analysis"],
	});
	expect(catalog.optionalTools).toContain(
		"Trail of Bits static-analysis [skill]",
	);
	expect(
		parseOfficialSkillPage(
			`
				<h1>security-best-practices</h1>
				<p>Community security checks.</p>
				<p>bunx skills add https://github.com/openai/skills --skill security-best-practices</p>
			`,
			officialSkillSourceUrl("openai", "security-best-practices"),
		),
	).toMatchObject({
		description: expect.stringContaining("."),
		sourceStatus: "community",
	});
});

test("Context7 install command can include API key", () => {
	expect(
		optionalFeatureCommands("install", ["ctx7"], {
			context7ApiKey: VALID_CONTEXT7_API_KEY,
		}),
	).toEqual([
		`ctx7 setup --cli --yes --codex --claude --opencode --api-key='${VALID_CONTEXT7_API_KEY}'`,
	]);
});
