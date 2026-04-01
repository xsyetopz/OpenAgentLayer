import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_PROMPTS } from "../source/agent-prompts.mjs";
import { PROJECT_GUIDANCE } from "../source/project-guidance.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "source");

function q(value) {
	return JSON.stringify(value);
}

async function readJson(relativePath) {
	return JSON.parse(
		await fs.readFile(path.join(SOURCE_DIR, relativePath), "utf8"),
	);
}

async function readText(...segments) {
	return fs.readFile(path.join(SOURCE_DIR, ...segments), "utf8");
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function writeFile(relativePath, content, executable = false) {
	const filePath = path.join(ROOT, relativePath);
	await ensureDir(path.dirname(filePath));
	await fs.writeFile(filePath, content);
	if (executable) {
		await fs.chmod(filePath, 0o755);
	}
}

function renderFrontmatter(fields) {
	const lines = ["---"];
	for (const [key, value] of fields) {
		if (Array.isArray(value)) {
			lines.push(`${key}:`);
			for (const item of value) {
				lines.push(`  - ${item}`);
			}
			continue;
		}
		lines.push(`${key}: ${value}`);
	}
	lines.push("---", "");
	return lines.join("\n");
}

function formatSection(title, body) {
	return `## ${title}\n\n${body.trim()}`;
}

function renderPromptSections(sections, sharedConstraints) {
	return [
		...sections.map((section) => formatSection(section.title, section.body)),
		formatSection("Shared Constraints", sharedConstraints),
		"",
	].join("\n\n");
}

function renderProjectGuidance(doc) {
	return [
		`# ${doc.title}`,
		...doc.sections.map((section) =>
			formatSection(section.title, section.body),
		),
		"",
	].join("\n\n");
}

async function cleanGeneratedDirs() {
	await fs.rm(path.join(ROOT, "claude", "agents"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(ROOT, "codex", "agents"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(ROOT, "claude", "skills"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(ROOT, "codex", "plugin", "openagentsbtw", "skills"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(ROOT, "opencode", "templates", "skills"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(ROOT, "opencode", "templates", "agents"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(ROOT, "opencode", "templates", "instructions"), {
		recursive: true,
		force: true,
	});
}

async function generateSkills(skills) {
	const skillBodyTokens = {
		claude: {
			SHIP_COMMIT_FOOTER_BLOCK:
				"Co-Authored-By: Claude <claude@users.noreply.github.com>",
		},
		codex: {
			SHIP_COMMIT_FOOTER_BLOCK: "",
		},
		opencode: {
			SHIP_COMMIT_FOOTER_BLOCK: "",
		},
	};

	function renderSkillBody(body, platform) {
		let rendered = body;
		for (const [token, value] of Object.entries(skillBodyTokens[platform])) {
			rendered = rendered.replaceAll(`__${token}__`, value);
		}
		return rendered;
	}

	for (const skill of skills) {
		const body = await readText("skills", skill.name, "body.md");
		const sourceReferenceDir = path.join(
			SOURCE_DIR,
			"skills",
			skill.name,
			"reference",
		);
		const claudeBody = renderSkillBody(body, "claude");
		const claudeContent =
			renderFrontmatter([
				["description", `>\n  ${skill.description}`],
				["user-invocable", String(skill.userInvocable)],
			]) +
			claudeBody.trim() +
			"\n";

		const renderedCodexBody = renderSkillBody(body, "codex");
		const codexBody = skill.codexLead
			? renderedCodexBody.replace(
					/^# [^\n]+\n/,
					(match) => `${match}\n${skill.codexLead}\n`,
				)
			: renderedCodexBody;

		const codexContent =
			renderFrontmatter([
				["name", skill.name],
				["description", `>\n  ${skill.description}`],
				["user-invocable", String(skill.userInvocable)],
			]) +
			codexBody.trim() +
			"\n";

		const opencodeBody = renderSkillBody(body, "opencode");
		const opencodeContent =
			renderFrontmatter([
				["name", skill.name],
				["description", skill.description],
				["compatibility", "opencode"],
			]) +
			opencodeBody.trim() +
			"\n";

		if (skill.platforms.includes("claude")) {
			const claudeSkillDir = path.join("claude", "skills", skill.name);
			await writeFile(path.join(claudeSkillDir, "SKILL.md"), claudeContent);
			if (
				await fs
					.stat(sourceReferenceDir)
					.then((stat) => stat.isDirectory())
					.catch(() => false)
			) {
				await fs.cp(
					sourceReferenceDir,
					path.join(ROOT, claudeSkillDir, "reference"),
					{ recursive: true },
				);
			}
		}
		if (skill.platforms.includes("codex")) {
			const codexSkillDir = path.join(
				"codex",
				"plugin",
				"openagentsbtw",
				"skills",
				skill.name,
			);
			await writeFile(path.join(codexSkillDir, "SKILL.md"), codexContent);
			const codexMetadataPath = path.join(
				SOURCE_DIR,
				"skills",
				skill.name,
				"openai.yaml",
			);
			if (
				await fs
					.stat(codexMetadataPath)
					.then((stat) => stat.isFile())
					.catch(() => false)
			) {
				await fs.copyFile(
					codexMetadataPath,
					path.join(ROOT, codexSkillDir, "openai.yaml"),
				);
			}
			if (
				await fs
					.stat(sourceReferenceDir)
					.then((stat) => stat.isDirectory())
					.catch(() => false)
			) {
				await fs.cp(
					sourceReferenceDir,
					path.join(ROOT, codexSkillDir, "reference"),
					{ recursive: true },
				);
			}
		}
		if (skill.platforms.includes("opencode")) {
			const opencodeSkillDir = path.join(
				"opencode",
				"templates",
				"skills",
				skill.name,
			);
			await writeFile(path.join(opencodeSkillDir, "SKILL.md"), opencodeContent);
			if (
				await fs
					.stat(sourceReferenceDir)
					.then((stat) => stat.isDirectory())
					.catch(() => false)
			) {
				await fs.cp(
					sourceReferenceDir,
					path.join(ROOT, opencodeSkillDir, "reference"),
					{ recursive: true },
				);
			}
		}
	}
}

function renderClaudeAgent(agent, prompt, claudeOverlay) {
	const frontmatter = renderFrontmatter([
		["name", agent.claude.displayName],
		["model", agent.claude.model],
		["color", agent.claude.color],
		["description", q(agent.claude.description)],
		["tools", agent.claude.tools],
		["skills", agent.claude.skills],
		["permissionMode", agent.claude.permissionMode],
		["maxTurns", String(agent.claude.maxTurns)],
		["effort", agent.claude.effort],
	]);

	return [
		frontmatter.trimEnd(),
		claudeOverlay.trim(),
		"",
		prompt.trim(),
		"",
	].join("\n");
}

function renderCodexAgent(agent, prompt, codexOverlay) {
	const instructions = [
		`You are ${agent.claude.displayName}, the openagentsbtw ${agent.name} agent for Codex.`,
		"",
		codexOverlay.trim(),
		"",
		prompt.trim(),
	].join("\n");

	return [
		"# openagentsbtw managed file. Generated from source/ via scripts/generate.mjs",
		`name = ${q(agent.name)}`,
		`description = ${q(agent.codex.description)}`,
		`model = ${q(agent.codex.model)}`,
		`model_reasoning_effort = ${q(agent.codex.reasoning)}`,
		`sandbox_mode = ${q(agent.codex.sandboxMode)}`,
		'developer_instructions = """',
		instructions.trim(),
		'"""',
		"",
	].join("\n");
}

function renderOpenCodeAgent(prompt, opencodeOverlay) {
	return [opencodeOverlay.trim(), "", prompt.trim(), ""].join("\n");
}

async function generateAgents(agents) {
	const sharedConstraints = await readText("shared", "constraints.md");
	const claudeOverlay = await readText("platform-overlays", "claude-agent.md");
	const codexOverlay = await readText("platform-overlays", "codex-agent.md");
	const opencodeOverlay = await readText(
		"platform-overlays",
		"opencode-agent.md",
	);

	for (const agent of agents) {
		const schema = AGENT_PROMPTS[agent.name];
		if (!schema) {
			throw new Error(`Missing prompt schema for agent ${agent.name}`);
		}
		const prompt = renderPromptSections(schema.sections, sharedConstraints);

		await writeFile(
			path.join("claude", "agents", `${agent.name}.md`),
			renderClaudeAgent(agent, prompt, claudeOverlay),
		);
		await writeFile(
			path.join("codex", "agents", `${agent.name}.toml`),
			renderCodexAgent(agent, prompt, codexOverlay),
		);
		await writeFile(
			path.join("opencode", "templates", "agents", `${agent.name}.md`),
			renderOpenCodeAgent(prompt, opencodeOverlay),
		);
	}
}

function addHookGroup(hooks, event, group) {
	hooks[event] ??= [];
	hooks[event].push(group);
}

function buildPlatformHookRecord(policy, platform) {
	if (platform === "claude" && policy.claude) {
		return {
			id: policy.id,
			status: "supported",
			surfaces: [
				{
					type: "hook",
					event: policy.claude.event,
					matcher: policy.claude.matcher ?? null,
					timeout: policy.claude.timeout ?? null,
					script: policy.script ?? null,
				},
			],
		};
	}

	if (platform === "codex" && policy.codex) {
		return {
			id: policy.id,
			status: "supported",
			surfaces: [
				{
					type: "hook",
					event: policy.codex.event,
					matcher: policy.codex.matcher ?? null,
					timeout: policy.codex.timeout ?? null,
					statusMessage: policy.codex.statusMessage ?? null,
					script: policy.script ?? null,
				},
			],
		};
	}

	if (platform === "opencode" && policy.opencode) {
		const surfaces = [];
		if (policy.opencode.plugin) {
			surfaces.push({
				type: "plugin",
				event: policy.opencode.plugin.event,
				tools: policy.opencode.plugin.tools ?? [],
				field: policy.opencode.plugin.field ?? null,
			});
		}
		for (const gitHook of policy.opencode.gitHooks ?? []) {
			surfaces.push({
				type: "git-hook",
				hook: gitHook.hook,
				kind: gitHook.kind,
			});
		}
		return {
			id: policy.id,
			status: "supported",
			surfaces,
		};
	}

	return {
		id: policy.id,
		status: "unsupported",
		reason:
			policy.unsupported?.[platform] ??
			"No mapping is defined for this platform in the shared hook policy source.",
	};
}

function renderHookManifestMarkdown(platformLabel, records) {
	const supported = records.filter((record) => record.status === "supported");
	const unsupported = records.filter(
		(record) => record.status === "unsupported",
	);

	const lines = [`# ${platformLabel} Hook Mapping`, ""];

	lines.push("## Supported Policies", "");
	for (const record of supported) {
		lines.push(`- \`${record.id}\``);
		for (const surface of record.surfaces) {
			if (surface.type === "hook") {
				const matcher = surface.matcher
					? `, matcher \`${surface.matcher}\``
					: "";
				lines.push(
					`  ${surface.type}: event \`${surface.event}\`${matcher}${surface.script ? `, script \`${surface.script}\`` : ""}`,
				);
				continue;
			}
			if (surface.type === "plugin") {
				lines.push(
					`  plugin: event \`${surface.event}\`, tools ${surface.tools.map((tool) => `\`${tool}\``).join(", ")}${surface.field ? `, field \`${surface.field}\`` : ""}`,
				);
				continue;
			}
			lines.push(`  git-hook: \`${surface.hook}\` via \`${surface.kind}\``);
		}
	}

	lines.push("", "## Unsupported Policies", "");
	for (const record of unsupported) {
		lines.push(`- \`${record.id}\`: ${record.reason}`);
	}

	lines.push("");
	return lines.join("\n");
}

function renderOpenCodePlugin(policies) {
	const beforeRules = policies
		.filter(
			(policy) => policy.opencode?.plugin?.event === "tool.execute.before",
		)
		.map((policy) => ({
			id: policy.id,
			tools: policy.opencode.plugin.tools,
			field: policy.opencode.plugin.field,
			message: policy.opencode.plugin.message,
			patterns: policy.opencode.plugin.patterns,
		}));

	const ruleRows = beforeRules
		.map(
			(rule) => `  {
    id: ${q(rule.id)},
    tools: ${JSON.stringify(rule.tools)},
    field: ${q(rule.field)},
    message: ${q(rule.message)},
    patterns: [${rule.patterns.map((pattern) => pattern).join(", ")}],
  },`,
		)
		.join("\n");

	return `import type { Plugin } from "@opencode-ai/plugin";

const BEFORE_RULES = [
${ruleRows}
];

function resolveFieldValue(rule: { field: string }, output: Record<string, unknown>): string | null {
  const args =
    output.args && typeof output.args === "object"
      ? (output.args as Record<string, unknown>)
      : null;
  if (!args) {
    return null;
  }
  const value = args[rule.field];
  return typeof value === "string" ? value : null;
}

const openAgentsPlugin: Plugin = async () => ({
  "tool.execute.before": async (input, output) => {
    for (const rule of BEFORE_RULES) {
      if (!rule.tools.includes(input.tool)) {
        continue;
      }
      const value = resolveFieldValue(rule, output);
      if (!value) {
        continue;
      }
      const normalized = rule.field === "command" ? value.trim() : value;
      if (rule.patterns.some((pattern) => pattern.test(normalized))) {
        throw new Error(rule.message);
      }
    }
  },
});

export default openAgentsPlugin;
`;
}

function renderGitHookRule(rule) {
	switch (rule.kind) {
		case "staged-text-block":
			return `echo "Checking ${rule.label}..."
if git diff --cached --name-only | xargs grep -l ${q(rule.pattern)} 2>/dev/null; then
  echo ${q(rule.message)}
  exit 1
fi
`;
		case "staged-diff-pattern-block":
			return `echo "Checking ${rule.label}..."
PATTERNS=(
${rule.patterns.map((pattern) => `  ${q(pattern)}`).join("\n")}
)

for pattern in "\${PATTERNS[@]}"; do
  if git diff --cached | grep -E "$pattern" 2>/dev/null; then
    echo ${q(rule.message)}
    echo "Pattern matched: $pattern"
    exit 1
  fi
done
`;
		case "staged-path-block":
			return `echo "Checking ${rule.label}..."
if git diff --cached --name-only | grep -E ${q(rule.pattern)} 2>/dev/null; then
  echo ${q(rule.message)}
  exit 1
fi
`;
		case "package-test":
			return `if [ -f "package.json" ] && grep -q '"test"' package.json; then
  echo ${q(rule.label)}
  if command -v bun >/dev/null 2>&1; then
    if ! bun test 2>/dev/null && ! npm test; then
      echo ${q(rule.message)}
      exit 1
    fi
  elif command -v npm >/dev/null 2>&1; then
    if ! npm test; then
      echo ${q(rule.message)}
      exit 1
    fi
  fi
fi
`;
		case "branch-confirm":
			return `BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "Warning: you are about to push to $BRANCH"
  read -p "Are you sure you want to continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Push cancelled."
    exit 1
  fi
fi
`;
		default:
			throw new Error(`Unsupported OpenCode git hook rule kind: ${rule.kind}`);
	}
}

function renderOpenCodeGitHook(name, rules) {
	const header = [
		"#!/bin/bash",
		"",
		"set -e",
		"",
		`echo "Running ${name} checks..."`,
		"",
	];
	const body = rules.map((rule) => renderGitHookRule(rule)).join("\n");
	return [
		...header,
		body.trim(),
		"",
		`echo "✓ ${name} checks passed!"`,
		"exit 0",
		"",
	].join("\n");
}

async function generateHooks(policies) {
	const claudeProject = { hooks: {} };
	const claudePlugin = { hooks: {} };
	const codex = { hooks: {} };

	const opencodeGitRules = {
		"pre-commit": [],
		"pre-push": [],
	};

	for (const policy of policies) {
		if (policy.claude) {
			const group = {};
			if (policy.claude.matcher) {
				group.matcher = policy.claude.matcher;
			}
			group.hooks = [];
			if (policy.claude.prompt) {
				group.hooks.push({
					type: "prompt",
					prompt: policy.claude.prompt,
				});
			}
			group.hooks.push({
				type: "command",
				command: `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/scripts/${policy.script}`,
				timeout: policy.claude.timeout,
			});
			addHookGroup(claudeProject.hooks, policy.claude.event, group);

			const pluginGroup = {};
			if (policy.claude.matcher) {
				pluginGroup.matcher = policy.claude.matcher;
			}
			pluginGroup.hooks = [];
			if (policy.claude.prompt) {
				pluginGroup.hooks.push({
					type: "prompt",
					prompt: policy.claude.prompt,
				});
			}
			pluginGroup.hooks.push({
				type: "command",
				command: `H="\${CLAUDE_PLUGIN_ROOT}"/hooks/scripts/${policy.script}; [ -f "$H" ] && node "$H" || exit 0`,
				timeout: policy.claude.timeout,
			});
			addHookGroup(claudePlugin.hooks, policy.claude.event, pluginGroup);
		}

		if (policy.codex) {
			const group = {
				hooks: [
					{
						type: "command",
						command: `node "$HOME/.codex/openagentsbtw/hooks/scripts/${policy.script}"`,
						timeout: policy.codex.timeout,
						statusMessage: policy.codex.statusMessage,
					},
				],
			};
			if (policy.codex.matcher) {
				group.matcher = policy.codex.matcher;
			}
			addHookGroup(codex.hooks, policy.codex.event, group);
		}

		for (const gitRule of policy.opencode?.gitHooks ?? []) {
			opencodeGitRules[gitRule.hook].push(gitRule);
		}
	}

	await writeFile(
		path.join("claude", "hooks", "configs", "hooks.json"),
		JSON.stringify(claudeProject, null, 2) + "\n",
	);
	await writeFile(
		path.join("claude", "hooks", "hooks.json"),
		JSON.stringify(claudePlugin, null, 2) + "\n",
	);
	await writeFile(
		path.join("codex", "hooks", "hooks.json"),
		JSON.stringify(codex, null, 2) + "\n",
	);

	await writeFile(
		path.join("opencode", "templates", "plugins", "openagentsbtw.ts"),
		renderOpenCodePlugin(policies),
	);
	await writeFile(
		path.join("opencode", "templates", "hooks", "pre-commit"),
		renderOpenCodeGitHook("pre-commit", opencodeGitRules["pre-commit"]),
		true,
	);
	await writeFile(
		path.join("opencode", "templates", "hooks", "pre-push"),
		renderOpenCodeGitHook("pre-push", opencodeGitRules["pre-push"]),
		true,
	);

	const claudeManifest = policies.map((policy) =>
		buildPlatformHookRecord(policy, "claude"),
	);
	const codexManifest = policies.map((policy) =>
		buildPlatformHookRecord(policy, "codex"),
	);
	const opencodeManifest = policies.map((policy) =>
		buildPlatformHookRecord(policy, "opencode"),
	);

	await writeFile(
		path.join("claude", "hooks", "policy-map.json"),
		JSON.stringify(claudeManifest, null, 2) + "\n",
	);
	await writeFile(
		path.join("claude", "hooks", "HOOKS.md"),
		renderHookManifestMarkdown("Claude", claudeManifest),
	);
	await writeFile(
		path.join("codex", "hooks", "policy-map.json"),
		JSON.stringify(codexManifest, null, 2) + "\n",
	);
	await writeFile(
		path.join("codex", "hooks", "HOOKS.md"),
		renderHookManifestMarkdown("Codex", codexManifest),
	);
	await writeFile(
		path.join("opencode", "templates", "hooks", "policy-map.json"),
		JSON.stringify(opencodeManifest, null, 2) + "\n",
	);
	await writeFile(
		path.join("opencode", "templates", "hooks", "HOOKS.md"),
		renderHookManifestMarkdown("OpenCode", opencodeManifest),
	);
}

function renderOpenCodeCommands(commands) {
	const rows = commands
		.map((command) => {
			const parts = [
				"  {",
				`    name: ${q(command.name)},`,
				`    description: ${q(command.description)},`,
				`    agent: ${q(command.agent)},`,
				`    promptTemplate: ${q(command.promptTemplate)},`,
				"  },",
			];
			return parts.join("\n");
		})
		.join("\n");

	return [
		'import type { CommandDefinition } from "./types.ts";',
		"",
		"export const COMMAND_DEFINITIONS: CommandDefinition[] = [",
		rows,
		"];",
		"",
	].join("\n");
}

function renderCodexWrapper(commandName, modes) {
	const cases = modes
		.map((mode) => {
			const configOverrides = (mode.configOverrides ?? [])
				.map((entry) => `        CODEX_CONFIG_ARGS+=(-c ${q(entry)})`)
				.join("\n");
			const deepwikiGuard = mode.requiresDeepwiki
				? `        if ! grep -Eq '^[[:space:]]*\\[mcp_servers\\.deepwiki\\]' "$HOME/.codex/config.toml" 2>/dev/null; then
            echo "DeepWiki is not configured. Reinstall with --codex-deepwiki or use triage." >&2
            exit 1
        fi
        if [[ ! -d .git ]] || ! git remote get-url origin 2>/dev/null | grep -Eq '^https://github\\.com/|^git@github\\.com:'; then
            echo "DeepWiki mode expects a GitHub repository. Use triage for local-only or non-GitHub repos." >&2
            exit 1
        fi
`
				: "";
			return `    ${mode.mode})
        PROFILE=${q(mode.profile)}
        SYSTEM_PROMPT=${q(mode.prompt)}
${configOverrides ? `${configOverrides}\n` : ""}${deepwikiGuard}        ;;`;
		})
		.join("\n");
	const utilityModes =
		"  memory      Inspect or manage openagentsbtw Codex memory";
	const modeLines = [
		...modes.map(
			(mode) => `  ${mode.mode.padEnd(11)} Generated openagentsbtw Codex route`,
		),
		utilityModes,
	].join("\n");

	return `#!/bin/bash
set -euo pipefail

usage() {
    cat <<'EOF' >&2
Usage: ${commandName} <mode> [prompt...]

Modes:
${modeLines}

Memory commands:
  ${commandName} memory show [path]
  ${commandName} memory forget-project [path]
  ${commandName} memory prune
EOF
    exit 1
}

[[ $# -ge 1 ]] || usage

MODE="$1"
shift

if [[ "$MODE" == "memory" ]]; then
    [[ $# -ge 1 ]] || usage
    exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/memory-manage.mjs" "$@"
fi

if [[ $# -gt 0 ]]; then
    PROMPT="$*"
elif [[ ! -t 0 ]]; then
    PROMPT="$(cat)"
else
    usage
fi

PLUGIN_INVOKE=""
if [[ -f "$HOME/.codex/plugins/openagentsbtw/.codex-plugin/plugin.json" ]]; then
    PLUGIN_INVOKE=$'$openagentsbtw\\n\\n'
fi

PROFILE="openagentsbtw"
SYSTEM_PROMPT=""
CODEX_CONFIG_ARGS=()

case "$MODE" in
${cases}
    *)
        usage
        ;;
esac

exec codex exec --profile "$PROFILE" "\${CODEX_CONFIG_ARGS[@]}" "\${PLUGIN_INVOKE}\${SYSTEM_PROMPT}

Task:
\${PROMPT}"
`;
}

async function generateCommands(commandData) {
	await writeFile(
		path.join("opencode", "src", "commands.ts"),
		renderOpenCodeCommands(commandData.opencodeCommands),
	);
	await writeFile(
		path.join("bin", "openagentsbtw-codex"),
		renderCodexWrapper("openagentsbtw-codex", commandData.codexModes),
		true,
	);
	await writeFile(
		path.join("bin", "oabtw-codex"),
		renderCodexWrapper("oabtw-codex", commandData.codexModes),
		true,
	);
}

async function generateProjectInstructionAssets() {
	await writeFile(
		path.join("claude", "templates", "CLAUDE.md"),
		renderProjectGuidance(PROJECT_GUIDANCE.claude),
	);
	await writeFile(
		path.join("codex", "templates", "AGENTS.md"),
		renderProjectGuidance(PROJECT_GUIDANCE.codex),
	);
	await writeFile(
		path.join("opencode", "templates", "instructions", "openagentsbtw.md"),
		renderProjectGuidance(PROJECT_GUIDANCE.opencode),
	);
}

async function main() {
	const skills = await readJson("skills.json");
	const agents = await readJson("agents.json");
	const commandData = await readJson("commands.json");
	const policies = await readJson("hook-policies.json");

	await cleanGeneratedDirs();
	await generateSkills(skills);
	await generateAgents(agents);
	await generateHooks(policies);
	await generateCommands(commandData);
	await generateProjectInstructionAssets();

	console.log("Generated Claude, Codex, and OpenCode artifacts from source/");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
