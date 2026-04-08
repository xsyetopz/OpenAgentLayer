import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
let BUILD_ROOT = "";
let CLEANUP_BUILD_ROOT = false;

function run(command, args) {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, { stdio: "inherit", cwd: ROOT });
		child.on("exit", (code) => {
			if (code === 0) {
				resolvePromise();
				return;
			}
			reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
		});
	});
}

function readBuild(relativePath) {
	if (!BUILD_ROOT) {
		throw new Error("BUILD_ROOT not set");
	}
	return readFileSync(resolve(BUILD_ROOT, relativePath), "utf8");
}

function readRepo(relativePath) {
	return readFileSync(resolve(ROOT, relativePath), "utf8");
}

before(async () => {
	const preset = process.env["OABTW_TEST_BUILD_ROOT"];
	if (preset) {
		BUILD_ROOT = preset;
		CLEANUP_BUILD_ROOT = false;
		return;
	}

	BUILD_ROOT = resolve(tmpdir(), `openagentsbtw-build-${process.pid}`);
	CLEANUP_BUILD_ROOT = true;
	await run("node", ["scripts/build.mjs", "--out", BUILD_ROOT]);
});

after(() => {
	if (!BUILD_ROOT || !CLEANUP_BUILD_ROOT) {
		return;
	}
	rmSync(BUILD_ROOT, { recursive: true, force: true });
});

describe("generated prompts", () => {
	it("renders OpenCode prompts without legacy XML tags", () => {
		const prompt = readBuild("opencode/templates/agents/athena.md");
		assert.equal(prompt.includes("<identity>"), false);
		assert.equal(prompt.includes("<constraints>"), false);
		assert.equal(prompt.includes("<shared_constraints>"), false);
	});

	it("renders shared constraints once per prompt", () => {
		const prompt = readBuild("opencode/templates/agents/hephaestus.md");
		const matches = prompt.match(/^## Shared Constraints$/gm) ?? [];
		assert.equal(matches.length, 1);
	});
});

describe("generated skills", () => {
	it("renders platform-specific ship co-author trailers", () => {
		const claudeShip = readBuild("claude/skills/ship/SKILL.md");
		const codexShip = readBuild(
			"codex/plugin/openagentsbtw/skills/ship/SKILL.md",
		);
		const opencodeShip = readBuild("opencode/templates/skills/ship/SKILL.md");
		assert.match(
			claudeShip,
			/Co-Authored-By: Claude <claude@users\.noreply\.github\.com>/,
		);
		assert.equal(
			claudeShip.includes("Co-Authored-By: Codex via openagentsbtw"),
			false,
		);
		assert.equal(codexShip.includes("Co-Authored-By:"), false);
		assert.equal(opencodeShip.includes("Co-Authored-By:"), false);
	});

	it("ships the shared research skills across all platforms", () => {
		for (const relativePath of [
			"claude/skills/explore/SKILL.md",
			"claude/skills/trace/SKILL.md",
			"claude/skills/debug/SKILL.md",
			"codex/plugin/openagentsbtw/skills/explore/SKILL.md",
			"codex/plugin/openagentsbtw/skills/trace/SKILL.md",
			"codex/plugin/openagentsbtw/skills/debug/SKILL.md",
			"opencode/templates/skills/explore/SKILL.md",
			"opencode/templates/skills/trace/SKILL.md",
			"opencode/templates/skills/debug/SKILL.md",
		]) {
			assert.match(readBuild(relativePath), /# /);
		}
	});
});

describe("generated Codex defaults", () => {
	it("uses native commit attribution and ships the 5.2 / 5.3 Codex profile split", () => {
		const config = readBuild("codex/templates/config.toml");
		assert.match(
			config,
			/commit_attribution = "Co-Authored-By: Codex <codex@users\.noreply\.github\.com>"/,
		);
		assert.match(config, /model = "gpt-5\.2"/);
		assert.match(config, /model = "gpt-5\.3-codex"/);
		assert.match(config, /model = "gpt-5\.3-codex-spark"/);
		assert.match(config, /personality = "none"/);
		assert.equal(config.includes('personality = "pragmatic"'), false);
		assert.match(config, /\[profiles\.openagentsbtw-accept-edits\]/);
		assert.match(config, /approval_policy = "never"/);
		assert.match(config, /sqlite = true/);
	});

	it("ports the CCA-style response contract into Codex guidance", () => {
		const guidance = readBuild("codex/templates/AGENTS.md");
		assert.match(guidance, /Start with the answer, decision, or action\./);
		assert.match(guidance, /If something is uncertain, say `UNKNOWN`/);
		assert.match(
			guidance,
			/Use `gpt-5\.2` for high-reasoning main work, `gpt-5\.3-codex` for implementation, and `gpt-5\.3-codex-spark` for the lightweight mini profile\./,
		);
		assert.match(guidance, /oabtw-codex explore/);
		assert.match(guidance, /`deepwiki`/);
		assert.equal(
			guidance.includes("Keep responses terse and peer-like."),
			false,
		);
	});

	it("ships wrapper prompts that route through explicit specialist paths", () => {
		const wrapper = readBuild("bin/openagentsbtw-codex");
		const shortWrapper = readBuild("bin/oabtw-codex");
		assert.match(wrapper, /deepwiki\s+Generated openagentsbtw Codex route/);
		assert.match(wrapper, /explore\s+Generated openagentsbtw Codex route/);
		assert.match(wrapper, /trace\s+Generated openagentsbtw Codex route/);
		assert.match(wrapper, /debug\s+Generated openagentsbtw Codex route/);
		assert.match(
			wrapper,
			/Route planning through athena-style architecture analysis/,
		);
		assert.match(
			wrapper,
			/Treat native \/plan as reasoning mode only, not role selection\./,
		);
		assert.match(
			wrapper,
			/Route implementation through hephaestus-style execution/,
		);
		assert.match(shortWrapper, /accept\s+Generated openagentsbtw Codex route/);
		assert.match(
			shortWrapper,
			/memory\s+Inspect or manage openagentsbtw Codex memory/,
		);
		assert.match(shortWrapper, /memory show \[path\]/);
		assert.match(
			shortWrapper,
			/Route implementation through hephaestus-style execution on the sandboxed auto-accept profile/,
		);
		assert.match(
			shortWrapper,
			/CODEX_CONFIG_ARGS\+=\(-c "model = \\"gpt-5\.3-codex\\""\)/,
		);
		assert.equal(shortWrapper.includes("gpt-5.3-codex-spark"), false);
		assert.match(shortWrapper, /DeepWiki is not configured/);
		assert.match(shortWrapper, /Usage: oabtw-codex <mode> \[prompt\.\.\.\]/);
		assert.match(
			shortWrapper,
			/Route planning through athena-style architecture analysis/,
		);
	});

	it("keeps canonical plugin identifiers while adding only a wrapper alias", () => {
		const codexPlugin = readBuild(
			"codex/plugin/openagentsbtw/.codex-plugin/plugin.json",
		);
		const claudePlugin = readBuild("claude/.claude-plugin/plugin.json");
		const claudeSettings = readBuild("claude/templates/settings-global.json");
		assert.match(codexPlugin, /"name": "openagentsbtw"/);
		assert.match(claudePlugin, /"name": "openagentsbtw"/);
		assert.match(claudeSettings, /"openagentsbtw@openagentsbtw": true/);
		assert.equal(claudeSettings.includes('"oabtw@oabtw"'), false);
	});
});

describe("generated Copilot assets", () => {
	it("generates VS Code-compatible agent frontmatter", () => {
		const agent = readBuild("copilot/templates/.github/agents/athena.agent.md");
		assert.match(agent, /^---\n/m);
		assert.match(agent, /^name:\s+athena$/m);
		assert.match(agent, /^description:\s+/m);
		assert.equal(agent.includes("displayName:"), false);
	});

	it("generates Copilot hook config entries with required shell fields", () => {
		const hooks = JSON.parse(
			readBuild("copilot/templates/.github/hooks/openagentsbtw.json"),
		);
		assert.equal(hooks.version, 1);
		assert.ok(hooks.hooks?.preToolUse?.length);
		for (const entries of Object.values(hooks.hooks)) {
			for (const entry of entries) {
				assert.equal(entry.type, "command");
				assert.ok(typeof entry.bash === "string" && entry.bash.length > 0);
				assert.ok(
					typeof entry.powershell === "string" && entry.powershell.length > 0,
				);
				assert.ok(typeof entry.timeoutSec === "number" && entry.timeoutSec > 0);
			}
		}
	});

	it("does not emit unsupported Copilot skill frontmatter keys", () => {
		const skill = readBuild("copilot/templates/.github/skills/review/SKILL.md");
		assert.equal(skill.includes("compatibility:"), false);
	});
});

describe("generated Codex docs", () => {
	it("documents the Bash-only hook limitation", () => {
		const hooks = readRepo("docs/openai/hooks.md");
		assert.match(hooks, /PreToolUse` and `PostToolUse` only intercept `Bash`/);
		assert.match(hooks, /not a complete Claude-style permission layer/);
	});
});

describe("generated OpenCode assets", () => {
	it("uses documented instruction files instead of system transform injection", () => {
		const plugin = readBuild("opencode/templates/plugins/openagentsbtw.ts");
		assert.match(plugin, /"tool\.execute\.before"/);
		assert.equal(plugin.includes("experimental.chat.system.transform"), false);
	});

	it("ships a managed OpenCode instruction file", () => {
		const instructions = readBuild(
			"opencode/templates/instructions/openagentsbtw.md",
		);
		assert.match(instructions, /## Working Rules/);
		assert.match(instructions, /## Guardrails/);
	});

	it("ships an OpenCode hook manifest that includes plugin and git-hook surfaces", () => {
		const manifest = readBuild("opencode/templates/hooks/HOOKS.md");
		assert.match(manifest, /plugin: event `tool\.execute\.before`/);
		assert.match(manifest, /git-hook: `pre-commit`/);
		assert.match(manifest, /git-hook: `pre-push`/);
	});

	it("ships explicit OpenCode research commands", () => {
		const commands = readRepo("opencode/src/commands.ts");
		assert.match(commands, /name: "openagents-explore"/);
		assert.match(commands, /name: "openagents-trace"/);
		assert.match(commands, /name: "openagents-debug"/);
		assert.equal(commands.includes('name: "openagents-deps"'), false);
		assert.equal(commands.includes('name: "openagents-explain"'), false);
	});
});

describe("generated hook manifests", () => {
	it("makes Codex unsupported shared policies explicit", () => {
		const manifest = readBuild("codex/hooks/HOOKS.md");
		assert.match(manifest, /`write-quality`:/);
		assert.match(manifest, /`subagent-scan`:/);
	});

	it("emits machine-readable policy maps per platform", () => {
		const codex = JSON.parse(readBuild("codex/hooks/policy-map.json"));
		const opencode = JSON.parse(
			readBuild("opencode/templates/hooks/policy-map.json"),
		);
		assert.ok(
			codex.some(
				(entry) => entry.id === "bash-guard" && entry.status === "supported",
			),
		);
		assert.ok(
			codex.some(
				(entry) =>
					entry.id === "write-quality" && entry.status === "unsupported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) => entry.id === "bash-guard" && entry.status === "supported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) =>
					entry.id === "prompt-git-context" && entry.status === "unsupported",
			),
		);
	});

	it("keeps Codex hooks silent on routine success paths", () => {
		const hooks = JSON.parse(readBuild("codex/hooks/hooks.json"));
		assert.equal(JSON.stringify(hooks).includes('"statusMessage"'), false);

		const policyMap = JSON.parse(readBuild("codex/hooks/policy-map.json"));
		assert.equal(JSON.stringify(policyMap).includes('"statusMessage"'), false);
	});
});
