import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { providerOption, providerOptions, scopeOption } from "../src/arguments";
import { buildSetupArgs } from "../src/workflows";

const repoRoot = resolve(import.meta.dir, "../../..");

test("CLI provider parser accepts OAL providers and rejects unknown providers", () => {
	expect(providerOption("codex")).toBe("codex");
	expect(providerOption("opencode")).toBe("opencode");
	expect(() => providerOption("other")).toThrow("Unsupported provider other");
});

test("MCP command serves OAL-owned Anthropic and OpenCode tools", async () => {
	const anthropic = await runDocsMcp("anthropic", [
		{ jsonrpc: "2.0", id: 1, method: "initialize" },
		{ jsonrpc: "2.0", id: 2, method: "tools/list" },
		{
			jsonrpc: "2.0",
			id: 3,
			method: "tools/call",
			params: { name: "search_docs", arguments: { query: "Claude hooks" } },
		},
	]);
	expect(anthropic[0]?.result?.serverInfo?.name).toBe("oal-anthropic-docs");
	expect(anthropic[1]?.result?.tools?.[0]?.name).toBe("search_docs");
	expect(anthropic[2]?.result?.content?.[0]?.text).toContain("anthropic-docs");
	expect(anthropic[2]?.result?.content?.[0]?.text).toContain(
		"https://code.claude.com/docs/en/hooks",
	);

	const opencode = await runDocsMcp("opencode", [
		{ jsonrpc: "2.0", id: 1, method: "initialize" },
		{
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: { name: "list_docs", arguments: {} },
		},
	]);
	expect(opencode[0]?.result?.serverInfo?.name).toBe("oal-opencode-docs");
	expect(opencode[1]?.result?.content?.[0]?.text).toContain("opencode-docs");
	expect(opencode[1]?.result?.content?.[0]?.text).toContain(
		"https://opencode.ai/docs/plugins/",
	);
});

async function runDocsMcp(
	kind: "anthropic" | "opencode",
	requests: unknown[],
): Promise<JsonRpcResponse[]> {
	const server = kind === "anthropic" ? "anthropic-docs" : "opencode-docs";
	const proc = Bun.spawn(
		["bun", "packages/cli/src/main.ts", "mcp", "serve", server],
		{ cwd: repoRoot, stdin: "pipe", stdout: "pipe", stderr: "pipe" },
	);
	for (const request of requests)
		proc.stdin.write(`${JSON.stringify(request)}\n`);
	proc.stdin.end();
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0)
		throw new Error(`MCP command exited ${code} with stderr:\n${stderr}`);
	if (stderr !== "") throw new Error(`MCP command wrote stderr:\n${stderr}`);
	return stdout
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as JsonRpcResponse);
}

interface JsonRpcResponse {
	result?: {
		serverInfo?: { name?: string };
		tools?: { name?: string }[];
		content?: { text?: string }[];
	};
}

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
			optionalTools: ["ctx7", "deepwiki", "anthropic-docs"],
			toolchain: true,
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
		"--toolchain",
		"--optional",
		"ctx7,deepwiki,anthropic-docs",
		"--dry-run",
		"--verbose",
	]);
});
