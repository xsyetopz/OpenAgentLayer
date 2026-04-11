import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_PROMPTS } from "../source/agent-prompts.mjs";
import { PROJECT_GUIDANCE } from "../source/project-guidance.mjs";
import { renderCodexPeerWrapper } from "./generate/render/codex-peer-wrapper.mjs";
import { renderCodexWrapper } from "./generate/render/codex-wrapper.mjs";
import { renderOpenCodePlugin } from "./generate/render/opencode-plugin.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(REPO_ROOT, "source");
let OUTPUT_ROOT = REPO_ROOT;

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
	const filePath = path.join(OUTPUT_ROOT, relativePath);
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
	await fs.rm(path.join(OUTPUT_ROOT, "claude", "agents"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(OUTPUT_ROOT, "copilot", "templates"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(OUTPUT_ROOT, "copilot", "route-contracts.json"), {
		force: true,
	});
	await fs.rm(path.join(OUTPUT_ROOT, "codex", "agents"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(OUTPUT_ROOT, "claude", "skills"), {
		recursive: true,
		force: true,
	});
	await fs.rm(
		path.join(OUTPUT_ROOT, "codex", "plugin", "openagentsbtw", "skills"),
		{
			recursive: true,
			force: true,
		},
	);
	await fs.rm(path.join(OUTPUT_ROOT, "opencode", "templates", "skills"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(OUTPUT_ROOT, "opencode", "templates", "agents"), {
		recursive: true,
		force: true,
	});
	await fs.rm(path.join(OUTPUT_ROOT, "opencode", "templates", "instructions"), {
		recursive: true,
		force: true,
	});

	await fs.rm(path.join(OUTPUT_ROOT, "copilot", "hooks", "HOOKS.md"), {
		force: true,
	});
	await fs.rm(path.join(OUTPUT_ROOT, "copilot", "hooks", "policy-map.json"), {
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
		copilot: {
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

		const copilotBody = renderSkillBody(body, "copilot");
		const copilotContent =
			renderFrontmatter([
				["name", skill.name],
				["description", `>\n  ${skill.description}`],
			]) +
			copilotBody.trim() +
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
					path.join(OUTPUT_ROOT, claudeSkillDir, "reference"),
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
					path.join(OUTPUT_ROOT, codexSkillDir, "openai.yaml"),
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
					path.join(OUTPUT_ROOT, codexSkillDir, "reference"),
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
					path.join(OUTPUT_ROOT, opencodeSkillDir, "reference"),
					{ recursive: true },
				);
			}
		}
		if (skill.platforms.includes("copilot")) {
			for (const root of [
				path.join("copilot", "templates", ".github", "skills", skill.name),
				path.join("copilot", "templates", ".copilot", "skills", skill.name),
			]) {
				await writeFile(path.join(root, "SKILL.md"), copilotContent);
				if (
					await fs
						.stat(sourceReferenceDir)
						.then((stat) => stat.isDirectory())
						.catch(() => false)
				) {
					await fs.cp(
						sourceReferenceDir,
						path.join(OUTPUT_ROOT, root, "reference"),
						{ recursive: true },
					);
				}
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

function renderCopilotAgent(agent, prompt, copilotOverlay) {
	const frontmatter = renderFrontmatter([
		["name", agent.name],
		["description", q(agent.claude.description)],
	]);

	return [
		frontmatter.trimEnd(),
		copilotOverlay.trim(),
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
	const copilotOverlay = await readText(
		"platform-overlays",
		"copilot-agent.md",
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
			path.join(
				"copilot",
				"templates",
				".github",
				"agents",
				`${agent.name}.agent.md`,
			),
			renderCopilotAgent(agent, prompt, copilotOverlay),
		);
		await writeFile(
			path.join(
				"copilot",
				"templates",
				".copilot",
				"agents",
				`${agent.name}.agent.md`,
			),
			renderCopilotAgent(agent, prompt, copilotOverlay),
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
		const surface = {
			type: "hook",
			event: policy.codex.event,
			matcher: policy.codex.matcher ?? null,
			timeout: policy.codex.timeout ?? null,
			script: policy.script ?? null,
		};
		if (policy.codex.statusMessage) {
			surface.statusMessage = policy.codex.statusMessage;
		}

		return {
			id: policy.id,
			status: "supported",
			surfaces: [surface],
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

	if (platform === "copilot" && policy.copilot) {
		const surface = {
			type: "hook",
			event: policy.copilot.event,
			matcher: policy.copilot.matcher ?? null,
			timeout: policy.copilot.timeout ?? null,
			script: policy.script ?? null,
		};
		return {
			id: policy.id,
			status: "supported",
			surfaces: [surface],
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
				const tools =
					surface.tools && surface.tools.length > 0
						? `, tools ${surface.tools.map((tool) => `\`${tool}\``).join(", ")}`
						: "";
				lines.push(
					`  plugin: event \`${surface.event}\`${tools}${surface.field ? `, field \`${surface.field}\`` : ""}`,
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
    if ! bun test 2>/dev/null; then
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

async function generateHooks(policies, commandData, agents) {
	const claudeProject = { hooks: {} };
	const claudePlugin = { hooks: {} };
	const codex = { hooks: {} };
	const copilotProject = { version: 1, hooks: {} };
	const copilotGlobal = { version: 1, hooks: {} };

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
			const hook = {
				type: "command",
				command: `node "$HOME/.codex/openagentsbtw/hooks/scripts/${policy.script}"`,
				timeout: policy.codex.timeout,
			};
			if (policy.codex.statusMessage) {
				hook.statusMessage = policy.codex.statusMessage;
			}
			const group = {
				hooks: [hook],
			};
			if (policy.codex.matcher) {
				group.matcher = policy.codex.matcher;
			}
			addHookGroup(codex.hooks, policy.codex.event, group);
		}

		if (policy.copilot) {
			const timeoutSec = policy.copilot.timeout;
			const projectHook = {
				type: "command",
				bash: `node ".github/hooks/scripts/openagentsbtw/${policy.script}"`,
				powershell: `node ".github/hooks/scripts/openagentsbtw/${policy.script}"`,
				timeoutSec,
			};
			const globalHook = {
				type: "command",
				bash: `node "$HOME/.copilot/hooks/scripts/openagentsbtw/${policy.script}"`,
				powershell: `node "$HOME/.copilot/hooks/scripts/openagentsbtw/${policy.script}"`,
				timeoutSec,
			};
			addHookGroup(copilotProject.hooks, policy.copilot.event, projectHook);
			addHookGroup(copilotGlobal.hooks, policy.copilot.event, globalHook);
		}

		for (const gitRule of policy.opencode?.gitHooks ?? []) {
			opencodeGitRules[gitRule.hook].push(gitRule);
		}
	}

	await writeFile(
		path.join("claude", "hooks", "configs", "hooks.json"),
		`${JSON.stringify(claudeProject, null, 2)}\n`,
	);
	await writeFile(
		path.join("claude", "hooks", "hooks.json"),
		`${JSON.stringify(claudePlugin, null, 2)}\n`,
	);
	await writeFile(
		path.join("codex", "hooks", "hooks.json"),
		`${JSON.stringify(codex, null, 2)}\n`,
	);

	await writeFile(
		path.join("copilot", "templates", ".github", "hooks", "openagentsbtw.json"),
		`${JSON.stringify(copilotProject, null, 2)}\n`,
	);
	await writeFile(
		path.join(
			"copilot",
			"templates",
			".copilot",
			"hooks",
			"openagentsbtw.json",
		),
		`${JSON.stringify(copilotGlobal, null, 2)}\n`,
	);

	await writeFile(
		path.join("opencode", "templates", "plugins", "openagentsbtw.ts"),
		renderOpenCodePlugin(policies, commandData.opencodeCommands, agents),
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
	const copilotManifest = policies.map((policy) =>
		buildPlatformHookRecord(policy, "copilot"),
	);

	await writeFile(
		path.join("claude", "hooks", "policy-map.json"),
		`${JSON.stringify(claudeManifest, null, 2)}\n`,
	);
	await writeFile(
		path.join("claude", "hooks", "HOOKS.md"),
		renderHookManifestMarkdown("Claude", claudeManifest),
	);
	await writeFile(
		path.join("codex", "hooks", "policy-map.json"),
		`${JSON.stringify(codexManifest, null, 2)}\n`,
	);
	await writeFile(
		path.join("codex", "hooks", "HOOKS.md"),
		renderHookManifestMarkdown("Codex", codexManifest),
	);
	await writeFile(
		path.join("opencode", "templates", "hooks", "policy-map.json"),
		`${JSON.stringify(opencodeManifest, null, 2)}\n`,
	);
	await writeFile(
		path.join("opencode", "templates", "hooks", "HOOKS.md"),
		renderHookManifestMarkdown("OpenCode", opencodeManifest),
	);

	await writeFile(
		path.join("copilot", "hooks", "policy-map.json"),
		`${JSON.stringify(copilotManifest, null, 2)}\n`,
	);
	await writeFile(
		path.join("copilot", "hooks", "HOOKS.md"),
		renderHookManifestMarkdown("Copilot", copilotManifest),
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
				`    routeKind: ${q(command.routeKind ?? "readonly")},`,
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

function expandClaudeContract(routeKind) {
	const expanded = expandRouteContract(routeKind);
	if (expanded.routeKind === "execution-required") {
		return {
			...expanded,
			allowDocsOnly: true,
		};
	}
	return expanded;
}

function expandRouteContract(routeKind) {
	switch (routeKind) {
		case "edit-required":
			return {
				routeKind,
				allowBlocked: true,
				allowDocsOnly: false,
				allowTestsOnly: false,
				rejectPrototypeScaffolding: true,
			};
		case "execution-required":
			return {
				routeKind,
				allowBlocked: true,
				allowDocsOnly: false,
				allowTestsOnly: true,
				rejectPrototypeScaffolding: false,
			};
		default:
			return {
				routeKind: "readonly",
				allowBlocked: true,
				allowDocsOnly: true,
				allowTestsOnly: true,
				rejectPrototypeScaffolding: false,
			};
	}
}

function buildClaudeRouteContracts(skills, agents) {
	return {
		skills: Object.fromEntries(
			skills
				.filter((skill) => skill.platforms.includes("claude"))
				.map((skill) => [
					skill.name,
					{
						route: skill.name,
						...expandClaudeContract(skill.claudeContract),
					},
				]),
		),
		agents: Object.fromEntries(
			agents.map((agent) => [
				agent.name,
				{
					route: agent.name,
					...expandClaudeContract(agent.claudeContract),
				},
			]),
		),
	};
}

function buildCopilotRouteContracts(skills, agents) {
	return {
		skills: Object.fromEntries(
			skills
				.filter((skill) => skill.platforms.includes("copilot"))
				.map((skill) => [
					skill.name,
					{
						route: skill.name,
						...expandRouteContract(
							skill.copilotContract ?? skill.claudeContract,
						),
					},
				]),
		),
		agents: Object.fromEntries(
			agents.map((agent) => [
				agent.name,
				{
					route: agent.name,
					...expandRouteContract(agent.copilotContract ?? agent.claudeContract),
				},
			]),
		),
	};
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
	await writeFile(
		path.join("bin", "openagentsbtw-codex-peer"),
		renderCodexPeerWrapper("openagentsbtw-codex-peer"),
		true,
	);
	await writeFile(
		path.join("bin", "oabtw-codex-peer"),
		renderCodexPeerWrapper("oabtw-codex-peer"),
		true,
	);
}

async function generateClaudeRouteContracts(skills, agents) {
	await writeFile(
		path.join("claude", "hooks", "route-contracts.json"),
		`${JSON.stringify(buildClaudeRouteContracts(skills, agents), null, 2)}\n`,
	);
}

async function generateCopilotRouteContracts(skills, agents) {
	const payload = `${JSON.stringify(
		buildCopilotRouteContracts(skills, agents),
		null,
		2,
	)}\n`;
	await writeFile(
		path.join("copilot", "hooks", "route-contracts.json"),
		payload,
	);
	await writeFile(
		path.join(
			"copilot",
			"templates",
			".github",
			"hooks",
			"route-contracts.json",
		),
		payload,
	);
	await writeFile(
		path.join(
			"copilot",
			"templates",
			".copilot",
			"hooks",
			"route-contracts.json",
		),
		payload,
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
	await writeFile(
		path.join("copilot", "templates", ".github", "copilot-instructions.md"),
		renderProjectGuidance(PROJECT_GUIDANCE.copilot),
	);
	await writeFile(
		path.join("copilot", "templates", ".copilot", "copilot-instructions.md"),
		renderProjectGuidance(PROJECT_GUIDANCE.copilot),
	);
}

function renderCopilotInstructionFile(description, body) {
	return (
		renderFrontmatter([["description", q(description)]]) + body.trim() + "\n"
	);
}

async function generateCopilotInstructionFiles() {
	const files = [
		{
			name: "openagentsbtw-general.instructions.md",
			description: "General openagentsbtw Copilot instructions",
			body: `# openagentsbtw General Instructions

- Follow objective facts, explicit requirements, and repository evidence over user affect.
- Complete real production work. Do not substitute demos, toy code, scaffolding, or tutorials.
- If blocked, stop with a concrete blocker instead of weakening requirements or pretending the work is done.
- Prefer native continuation with \`--continue\`, \`--resume\`, \`/resume\`, and \`/instructions\`.`,
		},
		{
			name: "openagentsbtw-codeGeneration.instructions.md",
			description: "Code generation rules for openagentsbtw Copilot sessions",
			body: `# openagentsbtw Code Generation

- Modify existing production paths when possible; avoid sidecar architecture unless the repo already uses it.
- Do not leave placeholders, mock implementations, tutorial comments, or “for now” scaffolding in real code.
- Keep diffs cohesive and verify outcomes with concrete evidence when the task requires execution.`,
		},
		{
			name: "openagentsbtw-testGeneration.instructions.md",
			description: "Test generation rules for openagentsbtw Copilot sessions",
			body: `# openagentsbtw Test Generation

- Prefer tests that validate actual behavior in this repo, not generic examples.
- When a route requires execution evidence, report the exact command or tool run and the result.
- Do not present hypothetical or unrun test plans as completed validation.`,
		},
		{
			name: "openagentsbtw-review.instructions.md",
			description: "Review rules for openagentsbtw Copilot sessions",
			body: `# openagentsbtw Review

- Lead with concrete findings and evidence.
- Treat prototype/demo code, placeholder logic, educational comments, and docs-only churn on implementation routes as first-class issues.
- Prefer exact file references and behavior-level risks over generic advice.`,
		},
	];

	for (const file of files) {
		for (const root of [
			path.join("copilot", "templates", ".github", "instructions"),
			path.join("copilot", "templates", ".copilot", "instructions"),
		]) {
			await writeFile(
				path.join(root, file.name),
				renderCopilotInstructionFile(file.description, file.body),
			);
		}
	}
}

function renderCopilotPrompt({ description, body }) {
	const frontmatter = renderFrontmatter([
		["description", q(description)],
		["agent", "agent"],
	]);
	return [frontmatter.trimEnd(), body.trim(), ""].join("\n\n");
}

async function generateCopilotPromptFiles(commandData) {
	const shared = [
		"- Keep tone neutral; do not add urgency, shame, or pressure.",
		"- Follow objective facts, explicit requests, and repository evidence over user affect.",
		"- Do real production work instead of demos, toy scaffolding, or educational detours.",
		"- If blocked, stop with a concrete blocker; do not game tests or weaken requirements.",
	].join("\n");

	for (const prompt of commandData.copilotPrompts ?? []) {
		const contract = expandRouteContract(prompt.routeKind);
		const routeLines = [
			`OPENAGENTSBTW_ROUTE=${prompt.name.replace(/^oabtw-/, "")}`,
			`OPENAGENTSBTW_CONTRACT=${contract.routeKind}`,
			`OPENAGENTSBTW_ALLOW_BLOCKED=${String(contract.allowBlocked)}`,
			`OPENAGENTSBTW_ALLOW_DOCS_ONLY=${String(contract.allowDocsOnly)}`,
			`OPENAGENTSBTW_ALLOW_TESTS_ONLY=${String(contract.allowTestsOnly)}`,
			`OPENAGENTSBTW_REJECT_PROTOTYPE_SCAFFOLDING=${String(contract.rejectPrototypeScaffolding)}`,
		].join("\n");
		const body = `# ${prompt.title}

${routeLines}

${prompt.body}

${shared}

Task:
{{prompt}}`;
		await writeFile(
			path.join(
				"copilot",
				"templates",
				".github",
				"prompts",
				`${prompt.name}.prompt.md`,
			),
			renderCopilotPrompt({
				agent: prompt.agent,
				description: prompt.description,
				body,
			}),
		);
	}
}

async function main() {
	const outIdx = process.argv.indexOf("--out");
	if (outIdx !== -1 && process.argv[outIdx + 1]) {
		OUTPUT_ROOT = path.resolve(process.argv[outIdx + 1]);
	}
	const outShortIdx = process.argv.indexOf("-o");
	if (outShortIdx !== -1 && process.argv[outShortIdx + 1]) {
		OUTPUT_ROOT = path.resolve(process.argv[outShortIdx + 1]);
	}

	const skills = await readJson("skills.json");
	const agents = await readJson("agents.json");
	const commandData = await readJson("commands.json");
	const policies = await readJson("hook-policies.json");

	await cleanGeneratedDirs();
	await generateSkills(skills);
	await generateAgents(agents);
	await generateHooks(policies, commandData, agents);
	await generateClaudeRouteContracts(skills, agents);
	await generateCopilotRouteContracts(skills, agents);
	await generateCommands(commandData);
	await generateProjectInstructionAssets();
	await generateCopilotInstructionFiles();
	await generateCopilotPromptFiles(commandData);

	console.log(
		"Generated Claude, Copilot, Codex, and OpenCode artifacts from source/",
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
