import { expect, test } from "bun:test";
import {
	optionalFeatureCommands,
	planToolchainInstall,
	renderToolchainPlan,
} from "../src";

test("macOS plan installs Homebrew before core tools when missing", () => {
	const plan = planToolchainInstall({ os: "macos", hasHomebrew: false });
	expect(plan.packageManager).toBe("brew");
	expect(plan.commands[0]).toContain("Homebrew/install");
	expect(plan.commands[1]).toContain("brew install bun ripgrep fd fzf");
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
	expect(plan.commands).toContain("rtk find --help");
	expect(renderToolchainPlan(plan)).toContain("confirm token savings");
	expect(renderToolchainPlan(plan)).toContain("at or above 80%");
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
		"bunx ctx7 setup --cli --yes --codex --claude --opencode",
	);
	expect(renderToolchainPlan(plan)).toContain(
		"bunx -p playwright playwright install --with-deps",
	);
	expect(renderToolchainPlan(plan)).toContain("```bash");
	expect(renderToolchainPlan(plan)).not.toContain("- bunx");
});

test("optional feature commands support install and removal", () => {
	expect(optionalFeatureCommands("install", ["ctx7", "playwright"])).toEqual([
		"bunx ctx7 setup --cli --yes --codex --claude --opencode",
		"bunx -p playwright playwright install --with-deps",
	]);
	expect(optionalFeatureCommands("remove", ["ctx7", "playwright"])).toEqual([
		"bunx ctx7 remove --cli --yes --codex --claude --opencode",
		"bunx -p playwright playwright uninstall --all",
	]);
	expect(
		optionalFeatureCommands("install", ["ctx7"], {
			providers: ["codex", "opencode"],
			scope: "project",
		}),
	).toEqual(["bunx ctx7 setup --cli --yes --codex --opencode --project"]);
	expect(
		optionalFeatureCommands("install", ["anthropic-docs", "opencode-docs"]),
	).toEqual([
		"claude mcp add oal-anthropic-docs --scope user -- oal mcp serve anthropic-docs",
		"opencode mcp add oal-opencode-docs -- oal mcp serve opencode-docs",
	]);
	expect(
		optionalFeatureCommands("remove", ["anthropic-docs", "opencode-docs"]),
	).toEqual([
		"claude mcp remove oal-anthropic-docs --scope user",
		"opencode mcp remove oal-opencode-docs",
	]);
});
