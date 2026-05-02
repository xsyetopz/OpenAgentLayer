import { expect, test } from "bun:test";
import { planToolchainInstall, renderToolchainPlan } from "../src";

test("macOS plan installs Homebrew before core tools when missing", () => {
	const plan = planToolchainInstall({ os: "macos", hasHomebrew: false });
	expect(plan.packageManager).toBe("brew");
	expect(plan.commands[0]).toContain("Homebrew/install");
	expect(plan.commands[1]).toContain("brew install bun ripgrep fd fzf");
	expect(plan.requiredTools).toContain("bun");
	expect(plan.commands).toContain("rtk gain");
	expect(plan.commands).toContain("rtk grep --help");
	expect(plan.commands).toContain("rtk find --help");
	expect(renderToolchainPlan(plan)).toContain("confirm token savings");
	expect(renderToolchainPlan(plan)).toContain("at or above 80%");
});

test("Linux plan uses selected distro package manager and optional tools", () => {
	const plan = planToolchainInstall({
		os: "linux",
		packageManager: "dnf",
		includeOptional: ["ctx7", "playwright"],
	});
	expect(plan.commands[0]).toBe("sudo dnf check-update || true");
	expect(renderToolchainPlan(plan)).toContain(
		"bunx ctx7 setup --cli --universal",
	);
	expect(renderToolchainPlan(plan)).toContain(
		"bunx playwright install --with-deps",
	);
});
