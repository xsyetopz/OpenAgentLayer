import { expect, test } from "bun:test";
import { providerOption, providerOptions, scopeOption } from "../src/arguments";
import { buildSetupArgs } from "../src/workflows";

test("CLI provider parser accepts OAL providers and rejects unknown providers", () => {
	expect(providerOption("codex")).toBe("codex");
	expect(providerOption("opencode")).toBe("opencode");
	expect(() => providerOption("other")).toThrow("Unsupported provider other");
});

test("CLI provider parser accepts comma-separated providers", () => {
	expect(providerOptions("codex,claude")).toEqual(["codex", "claude"]);
	expect(providerOptions("codex,codex")).toEqual(["codex"]);
	expect(providerOptions("all,codex")).toEqual(["all"]);
});

test("CLI scope parser accepts deploy scopes and rejects unknown scopes", () => {
	expect(scopeOption("project")).toBe("project");
	expect(scopeOption("global")).toBe("global");
	expect(() => scopeOption("workspace")).toThrow("Unsupported scope workspace");
});

test("interactive setup workflow builds low-level setup args", () => {
	expect(
		buildSetupArgs({
			providers: ["codex", "opencode"],
			scope: "global",
			home: "/home/oal",
			codexPlan: "pro-20",
			opencodePlan: "opencode-free",
			cavemanMode: "full",
			optionalTools: ["ctx7", "deepwiki"],
			rtk: true,
			dryRun: true,
			verbose: true,
		}),
	).toEqual([
		"--provider",
		"codex,opencode",
		"--scope",
		"global",
		"--home",
		"/home/oal",
		"--codex-plan",
		"pro-20",
		"--opencode-plan",
		"opencode-free",
		"--caveman-mode",
		"full",
		"--rtk",
		"--optional",
		"ctx7,deepwiki",
		"--dry-run",
		"--verbose",
	]);
});
