import { expect, test } from "bun:test";
import {
	context7ApiKeyStatus,
	optionalFeatureCommands,
	planToolchainInstall,
	renderToolchainPlan,
} from "../src";

const WHITESPACE_PATTERN = /\s+/;
const VALID_CONTEXT7_API_KEY = ["ctx7sk", "abcdefghijklmnop"].join("-");

test("macOS plan installs Homebrew before core tools when missing", () => {
	const plan = planToolchainInstall({ os: "macos", hasHomebrew: false });
	expect(plan.packageManager).toBe("brew");
	expect(plan.commands[0]).toContain("Homebrew/install");
	expect(plan.commands[1]).toContain("bun.sh/install");
	const brewCommand = plan.commands.find((command) =>
		command.startsWith("brew install "),
	);
	expect(brewCommand?.split(WHITESPACE_PATTERN)).toContain("ripgrep");
	expect(brewCommand?.split(WHITESPACE_PATTERN)).not.toContain("bun");
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
		optionalFeatureCommands("install", ["anthropic-docs", "opencode-docs"]),
	).toEqual([
		"claude mcp add oal-anthropic-docs --scope user -- oal mcp serve anthropic-docs",
		"oal mcp install opencode-docs --provider opencode --scope global",
	]);
	expect(
		optionalFeatureCommands("remove", ["anthropic-docs", "opencode-docs"]),
	).toEqual([
		"claude mcp remove oal-anthropic-docs --scope user",
		"oal mcp remove opencode-docs --provider opencode --scope global",
	]);
	expect(
		optionalFeatureCommands("install", ["anthropic-docs", "opencode-docs"], {
			providers: ["codex", "opencode"],
		}),
	).toEqual([
		"oal mcp install opencode-docs --provider opencode --scope global",
	]);
});

test("Playwright optional setup installs OpenAI Playwright skill when roots are known", () => {
	expect(
		optionalFeatureCommands("install", ["playwright"], {
			providers: ["codex", "opencode"],
			repoRoot: "/repo",
			targetRoot: "/target",
		}),
	).toEqual([
		"bunx -p playwright playwright install --with-deps",
		"git -C '/repo' submodule update --init --recursive third_party/openai-skills",
		"mkdir -p '/target/.codex/openagentlayer/skills/playwright' && cp -R '/repo/third_party/openai-skills/skills/.curated/playwright/.' '/target/.codex/openagentlayer/skills/playwright'",
		"mkdir -p '/target/.opencode/skills/playwright' && cp -R '/repo/third_party/openai-skills/skills/.curated/playwright/.' '/target/.opencode/skills/playwright'",
	]);
	expect(optionalFeatureCommands("install", ["playwright"])).toEqual([
		"bunx -p playwright playwright install --with-deps",
	]);
	expect(
		optionalFeatureCommands("install", ["ctx7"], {
			repoRoot: "/repo",
			targetRoot: "/target",
		}),
	).not.toContainEqual(expect.stringContaining("openai-skills"));
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

test("Context7 install command can include API key", () => {
	expect(
		optionalFeatureCommands("install", ["ctx7"], {
			context7ApiKey: VALID_CONTEXT7_API_KEY,
		}),
	).toEqual([
		`ctx7 setup --cli --yes --codex --claude --opencode --api-key='${VALID_CONTEXT7_API_KEY}'`,
	]);
});
