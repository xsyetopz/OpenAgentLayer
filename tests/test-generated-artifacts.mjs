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
	it("uses native commit attribution and ships the plan-aware Codex profile split", () => {
		const config = readBuild("codex/templates/config.toml");
		assert.match(
			config,
			/commit_attribution = "Co-Authored-By: Codex <codex@users\.noreply\.github\.com>"/,
		);
		assert.match(config, /sqlite_home = "~\/\.codex\/openagentsbtw\/sqlite"/);
		assert.match(config, /hide_agent_reasoning = true/);
		assert.match(config, /tool_output_token_limit = 12000/);
		assert.match(config, /\[history\]/);
		assert.match(config, /persistence = "save-all"/);
		assert.match(config, /max_bytes = 134217728/);
		assert.match(config, /\[memories\]/);
		assert.match(config, /no_memories_if_mcp_or_web_search = true/);
		assert.match(
			config,
			/compact_prompt = """[\s\S]*Follow objective task requirements and repo facts, not the user's emotional tone\./,
		);
		assert.match(config, /\[profiles\.openagentsbtw-go\]/);
		assert.match(config, /\[profiles\.openagentsbtw-plus\]/);
		assert.match(config, /\[profiles\.openagentsbtw-pro-5\]/);
		assert.match(config, /\[profiles\.openagentsbtw-pro-20\]/);
		assert.match(config, /model = "gpt-5\.2"/);
		assert.match(config, /model = "gpt-5\.3-codex"/);
		assert.match(config, /model = "gpt-5\.3-codex-spark"/);
		assert.match(config, /model = "gpt-5\.4-mini"/);
		assert.match(config, /personality = "none"/);
		assert.equal(config.includes('personality = "pragmatic"'), false);
		assert.match(config, /\[profiles\.openagentsbtw-implement\]/);
		assert.match(config, /\[profiles\.openagentsbtw-accept-edits\]/);
		assert.match(config, /\[profiles\.openagentsbtw-longrun\]/);
		assert.match(config, /agents\.max_threads = 6/);
		assert.match(config, /background_terminal_max_timeout = 7200/);
		assert.match(config, /unified_exec = true/);
		assert.match(config, /prevent_idle_sleep = true/);
		assert.match(config, /approval_policy = "never"/);
		assert.match(config, /sqlite = true/);
	});

	it("ports the CCA-style response contract into Codex guidance", () => {
		const guidance = readBuild("codex/templates/AGENTS.md");
		assert.match(guidance, /Start with the answer, decision, or action\./);
		assert.match(guidance, /If something is uncertain, say `UNKNOWN`/);
		assert.match(guidance, /Use the active Codex plan preset\./);
		assert.match(guidance, /oabtw-codex explore/);
		assert.match(guidance, /`deepwiki`/);
		assert.match(guidance, /Default to role routing:/);
		assert.match(guidance, /Multi-agent safety:/);
		assert.match(
			guidance,
			/Subagents: Codex only spawns subagents when explicitly asked\./,
		);
		assert.match(guidance, /Pro plans/);
		assert.match(guidance, /Prompt contracts:/);
		assert.match(guidance, /Avoid slop \+ god objects:/);
		assert.match(
			guidance,
			/External docs: when third-party library\/API\/setup\/configuration work depends on external docs and `ctx7` is available, use it automatically\./,
		);
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
		assert.match(wrapper, /qa\s+Generated openagentsbtw Codex route/);
		assert.match(wrapper, /resume\s+Generated openagentsbtw Codex route/);
		assert.match(wrapper, /plan-fast\s+Generated openagentsbtw Codex route/);
		assert.match(
			wrapper,
			/implement-fast\s+Generated openagentsbtw Codex route/,
		);
		assert.match(wrapper, /review-fast\s+Generated openagentsbtw Codex route/);
		assert.match(wrapper, /longrun\s+Generated openagentsbtw Codex route/);
		assert.match(wrapper, /swarm\s+Generated openagentsbtw Codex route/);
		assert.match(
			wrapper,
			/CODEX_CONFIG_ARGS\+=\(-c "features\.fast_mode = true"\)/,
		);
		assert.match(
			wrapper,
			/CODEX_CONFIG_ARGS\+=\(-c "service_tier = \\"fast\\""\)/,
		);
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
		assert.match(wrapper, /OPENAGENTSBTW_ROUTE=implement/);
		assert.match(wrapper, /OPENAGENTSBTW_CONTRACT=edit-required/);
		assert.match(wrapper, /OPENAGENTSBTW_REJECT_PROTOTYPE_SCAFFOLDING=true/);
		assert.match(wrapper, /OPENAGENTSBTW_ROUTE=qa/);
		assert.match(wrapper, /OPENAGENTSBTW_CONTRACT=execution-required/);
		assert.match(
			wrapper,
			/run-codex-filtered\.mjs" resume --profile "\$PROFILE" "\$@"/,
		);
		assert.match(
			wrapper,
			/Route this through patient long-run execution on the longrun profile/,
		);
		assert.match(shortWrapper, /accept\s+Generated openagentsbtw Codex route/);
		assert.match(
			shortWrapper,
			/memory\s+Inspect or manage openagentsbtw Codex memory/,
		);
		assert.match(shortWrapper, /memory show \[path\]/);
		assert.match(shortWrapper, /resume\s+Generated openagentsbtw Codex route/);
		assert.match(
			shortWrapper,
			/Route implementation through hephaestus-style execution on the sandboxed auto-accept implementation profile/,
		);
		assert.match(shortWrapper, /PROFILE="openagentsbtw-implement"/);
		assert.equal(shortWrapper.includes("gpt-5.3-codex-spark"), false);
		assert.match(shortWrapper, /DeepWiki is not configured/);
		assert.match(shortWrapper, /Usage: oabtw-codex <mode> \[prompt\.\.\.\]/);
		assert.match(
			shortWrapper,
			/Route planning through athena-style architecture analysis/,
		);
		const peerWrapper = readBuild("bin/oabtw-codex-peer");
		assert.match(peerWrapper, /Usage: oabtw-codex-peer <batch\|tmux>/);
		assert.match(peerWrapper, /Run orchestrator, QA, worker, and review/);
		assert.match(
			peerWrapper,
			/if \[\[ "\$1" == "--help" \|\| "\$1" == "help" \]\]/,
		);
		assert.match(peerWrapper, /if \[\[ \$\{#ARGS\[@\]\} -gt 0 \]\]/);
	});

	it("ships the managed Codex hook-noise scrubber", () => {
		const helper = readBuild(
			"codex/hooks/scripts/session/run-codex-filtered.mjs",
		);
		assert.match(helper, /OABTW_CODEX_FILTER_TUI_HOOK_NOISE/);
		assert.match(
			helper,
			/UserPromptSubmit\|SessionStart\|PreToolUse\|PostToolUse\|Stop/,
		);
	});

	it("keeps canonical plugin identifiers while adding only a wrapper alias", () => {
		const codexPlugin = readBuild(
			"codex/plugin/openagentsbtw/.codex-plugin/plugin.json",
		);
		const claudePlugin = readBuild("claude/.claude-plugin/plugin.json");
		const claudeSettings = readBuild("claude/templates/settings-global.json");
		const claudeHooks = readBuild("claude/hooks/hooks.json");
		const routeContracts = JSON.parse(
			readBuild("claude/hooks/route-contracts.json"),
		);
		assert.match(codexPlugin, /"name": "openagentsbtw"/);
		assert.match(claudePlugin, /"name": "openagentsbtw"/);
		assert.match(claudeSettings, /"openagentsbtw@openagentsbtw": true/);
		assert.match(
			claudeSettings,
			/"CLAUDE_CODE_SAVE_HOOK_ADDITIONAL_CONTEXT": "1"/,
		);
		assert.match(claudeHooks, /"SubagentStart"/);
		assert.match(claudeHooks, /subagent-route-context\.mjs/);
		assert.equal(routeContracts.skills.review.routeKind, "readonly");
		assert.equal(routeContracts.skills.test.routeKind, "execution-required");
		assert.equal(routeContracts.agents.hephaestus.routeKind, "edit-required");
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
		assert.match(JSON.stringify(hooks), /rtk-enforce\.mjs/);
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
	it("documents hook limitations and RTK activation rules", () => {
		const hooks = readRepo("docs/openai/hooks.md");
		assert.match(hooks, /PreToolUse` and `PostToolUse` only intercept `Bash`/);
		assert.match(hooks, /not a complete Claude-style permission layer/);
		assert.match(hooks, /pre\/rtk-enforce\.mjs/);
		assert.match(hooks, /`RTK\.md` policy is present/);
	});

	it("documents peer threads as openagentsbtw-managed instead of native Codex behavior", () => {
		const plugins = readRepo("docs/openai/plugins-skills-subagents.md");
		assert.match(plugins, /Peer Threads/);
		assert.match(plugins, /not a native Codex feature/);
		assert.match(plugins, /\.openagentsbtw\/codex-peer\/<run-id>\//);
	});
});

describe("installer docs", () => {
	it("documents shared cross-platform optional surfaces", () => {
		const install = readRepo("docs/install.md");
		assert.match(install, /Shared cross-platform surfaces/);
		assert.match(install, /`ctx7` CLI/);
		assert.match(install, /RTK enforcement/);
		assert.match(install, /Playwright CLI/);
		assert.match(install, /DeepWiki MCP/);
		assert.match(install, /explicit `deepwiki` exploration routing/);
	});

	it("documents installer decomposition", () => {
		const install = readRepo("docs/install.md");
		const readme = readRepo("README.md");
		assert.match(readme, /Installer\/generator decomposition/);
		assert.match(install, /Installer\/generator decomposition/);
		assert.match(readme, /thin Bash compatibility wrapper/);
		assert.match(install, /thin Bash wrapper/);
	});
});

describe("generated OpenCode assets", () => {
	it("uses native OpenCode plugin hooks for route tracking and completion gates", () => {
		const plugin = readBuild("opencode/templates/plugins/openagentsbtw.ts");
		assert.match(plugin, /"chat\.message"/);
		assert.match(plugin, /"command\.execute\.before"/);
		assert.match(plugin, /"tool\.execute\.before"/);
		assert.match(plugin, /"tool\.execute\.after"/);
		assert.match(plugin, /"experimental\.session\.compacting"/);
		assert.match(plugin, /"experimental\.text\.complete"/);
		assert.match(plugin, /kind: "rtk-rewrite"/);
		assert.match(plugin, /resolveCommandCwd/);
		assert.match(plugin, /const COMMAND_CONTRACTS =/);
		assert.match(plugin, /const AGENT_CONTRACTS =/);
		assert.match(plugin, /BLOCKED:/);
	});

	it("ships a managed OpenCode instruction file", () => {
		const instructions = readBuild(
			"opencode/templates/instructions/openagentsbtw.md",
		);
		assert.match(instructions, /## Working Rules/);
		assert.match(instructions, /## Guardrails/);
		assert.match(
			instructions,
			/third-party library\/API\/setup\/config docs are needed and `ctx7` is available, use it automatically/,
		);
		assert.match(instructions, /openagentsbtw roles are additive/);
		assert.match(instructions, /`opencode --continue`, `\/sessions`, `\/compact`, and `task_id` reuse/);
	});

	it("ships an OpenCode hook manifest that includes plugin and git-hook surfaces", () => {
		const manifest = readBuild("opencode/templates/hooks/HOOKS.md");
		assert.match(manifest, /plugin: event `chat\.message`/);
		assert.match(manifest, /plugin: event `tool\.execute\.before`/);
		assert.match(manifest, /plugin: event `tool\.execute\.after`/);
		assert.match(manifest, /plugin: event `experimental\.text\.complete`/);
		assert.match(manifest, /git-hook: `pre-commit`/);
		assert.match(manifest, /git-hook: `pre-push`/);
	});

	it("ships explicit OpenCode research commands", () => {
		const commands = readRepo("opencode/src/commands.ts");
		assert.match(commands, /name: "openagents-explore"/);
		assert.match(commands, /name: "openagents-trace"/);
		assert.match(commands, /name: "openagents-debug"/);
		assert.match(commands, /routeKind: "edit-required"/);
		assert.match(commands, /routeKind: "execution-required"/);
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
			codex.some(
				(entry) => entry.id === "rtk-enforce" && entry.status === "supported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) => entry.id === "bash-guard" && entry.status === "supported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) => entry.id === "rtk-enforce" && entry.status === "supported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) =>
					entry.id === "prompt-git-context" && entry.status === "supported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) =>
					entry.id === "subagent-scan" && entry.status === "supported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) =>
					entry.id === "stop-scan" && entry.status === "supported",
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
