import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

function read(relativePath) {
	return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("generated prompts", () => {
	it("renders OpenCode prompts without legacy XML tags", () => {
		const prompt = read("opencode/templates/agents/athena.md");
		assert.equal(prompt.includes("<identity>"), false);
		assert.equal(prompt.includes("<constraints>"), false);
		assert.equal(prompt.includes("<shared_constraints>"), false);
	});

	it("renders shared constraints once per prompt", () => {
		const prompt = read("opencode/templates/agents/hephaestus.md");
		const matches = prompt.match(/^## Shared Constraints$/gm) ?? [];
		assert.equal(matches.length, 1);
	});
});

describe("generated OpenCode assets", () => {
	it("uses documented instruction files instead of system transform injection", () => {
		const plugin = read("opencode/templates/plugins/openagentsbtw.ts");
		assert.match(plugin, /"tool\.execute\.before"/);
		assert.equal(plugin.includes("experimental.chat.system.transform"), false);
	});

	it("ships a managed OpenCode instruction file", () => {
		const instructions = read("opencode/templates/instructions/openagentsbtw.md");
		assert.match(instructions, /## Working Rules/);
		assert.match(instructions, /## Guardrails/);
	});

	it("ships an OpenCode hook manifest that includes plugin and git-hook surfaces", () => {
		const manifest = read("opencode/templates/hooks/HOOKS.md");
		assert.match(manifest, /plugin: event `tool\.execute\.before`/);
		assert.match(manifest, /git-hook: `pre-commit`/);
		assert.match(manifest, /git-hook: `pre-push`/);
	});
});

describe("generated hook manifests", () => {
	it("makes Codex unsupported shared policies explicit", () => {
		const manifest = read("codex/hooks/HOOKS.md");
		assert.match(manifest, /`write-quality`:/);
		assert.match(manifest, /`subagent-scan`:/);
	});

	it("emits machine-readable policy maps per platform", () => {
		const codex = JSON.parse(read("codex/hooks/policy-map.json"));
		const opencode = JSON.parse(read("opencode/templates/hooks/policy-map.json"));
		assert.ok(codex.some((entry) => entry.id === "bash-guard" && entry.status === "supported"));
		assert.ok(codex.some((entry) => entry.id === "write-quality" && entry.status === "unsupported"));
		assert.ok(opencode.some((entry) => entry.id === "bash-guard" && entry.status === "supported"));
		assert.ok(opencode.some((entry) => entry.id === "prompt-git-context" && entry.status === "unsupported"));
	});
});
