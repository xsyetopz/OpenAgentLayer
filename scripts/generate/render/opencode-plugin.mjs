function q(value) {
	return JSON.stringify(value);
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

export function renderOpenCodePlugin(policies, commands, agents) {
	const beforeRules = policies
		.filter(
			(policy) => policy.opencode?.plugin?.event === "tool.execute.before",
		)
		.map((policy) => ({
			id: policy.id,
			tools: policy.opencode.plugin.tools,
			field: policy.opencode.plugin.field,
			kind: policy.opencode.plugin.kind || "pattern-block",
			message: policy.opencode.plugin.message,
			patterns: policy.opencode.plugin.patterns || [],
		}));

	const routeCommands = Object.fromEntries(
		commands.map((command) => [
			command.name,
			{
				route: command.name,
				agent: command.agent,
				...expandRouteContract(command.routeKind),
			},
		]),
	);

	const routeAgents = Object.fromEntries(
		agents.map((agent) => [
			agent.name,
			{
				route: agent.name,
				...expandRouteContract(agent.claudeContract),
			},
		]),
	);

	const beforeRuleRows = beforeRules
		.map(
			(rule) => `  {
    id: ${q(rule.id)},
    tools: ${JSON.stringify(rule.tools)},
    field: ${q(rule.field)},
    kind: ${q(rule.kind)},
    message: ${q(rule.message)},
    patterns: [${rule.patterns.map((pattern) => pattern).join(", ")}],
  },`,
		)
		.join("\n");

	return `import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import type { Plugin } from "@opencode-ai/plugin";

const BEFORE_RULES = [
${beforeRuleRows}
];

const COMMAND_CONTRACTS = ${JSON.stringify(routeCommands, null, 2)};
const AGENT_CONTRACTS = ${JSON.stringify(routeAgents, null, 2)};
const NATIVE_AGENT_CONTRACTS = {
  build: routeContract("edit-required"),
  plan: routeContract("readonly"),
  explore: routeContract("readonly"),
  general: routeContract("edit-required"),
};

const SESSION_STATE = new Map();
const EXPLANATION_ONLY_PATTERNS = [
  /(?:^|\\n)here(?:'s| is) (?:how|what) /i,
  /(?:^|\\n)i would /i,
  /(?:^|\\n)to implement this/i,
  /(?:^|\\n)you can /i,
  /(?:^|\\n)this is a prototype/i,
];
const PROTOTYPE_PATTERNS = [
  /\\bprototype\\b/i,
  /\\bdemo\\b/i,
  /\\btoy\\b/i,
  /\\bexample\\b/i,
  /\\bsample app\\b/i,
  /for demonstration/i,
  /mock implementation/i,
  /simplified version/i,
  /placeholder/i,
];
const META_PATH_PATTERNS = [
  /^README\\.md$/i,
  /^CHANGELOG\\.md$/i,
  /^LICENSE$/i,
  /^docs\\//i,
  /^\\.github\\//i,
  /^\\.opencode\\//i,
  /^claude\\//i,
  /^codex\\//i,
  /^opencode\\/templates\\//i,
  /^source\\/hook-policies\\.json$/i,
];
const DOC_PATH_PATTERNS = [/\\.md$/i, /^docs\\//i];
const TEST_PATH_PATTERNS = [
  /(^|\\/)(__tests__|tests?|specs?)(\\/|$)/i,
  /(^|\\/).*\\.(test|spec)\\.[^/]+$/i,
];
const RTK_HOME_PATHS = [".config/openagentsbtw/RTK.md", ".codex/RTK.md", ".claude/RTK.md"];

function routeContract(routeKind) {
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

function routePriority(routeKind) {
  switch (routeKind) {
    case "edit-required":
      return 2;
    case "execution-required":
      return 1;
    default:
      return 0;
  }
}

function normalizePath(file) {
  return String(file || "").replaceAll("\\\\", "/").replace(/^\\.\\//, "");
}

function getSessionState(sessionID) {
  let state = SESSION_STATE.get(sessionID);
  if (state) return state;
  state = {
    route: undefined,
    contract: undefined,
    evidence: [],
    cwd: process.cwd(),
    agent: undefined,
    command: undefined,
    taskIDs: [],
  };
  SESSION_STATE.set(sessionID, state);
  return state;
}

function mergeContract(state, route, next) {
  if (!next) return;
  if (!state.contract || routePriority(next.routeKind) >= routePriority(state.contract.routeKind)) {
    state.route = route;
    state.contract = next;
  }
}

function safeSpawn(command, args, cwd) {
  try {
    return spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function gitRoot(cwd) {
  const result = safeSpawn("git", ["rev-parse", "--show-toplevel"], cwd);
  if (!result || result.status !== 0) return "";
  return (result.stdout || "").trim();
}

function gitBranch(cwd) {
  const result = safeSpawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (!result || result.status !== 0) return "";
  return (result.stdout || "").trim();
}

function gitRecent(cwd) {
  const result = safeSpawn("git", ["log", "-2", "--oneline"], cwd);
  if (!result || result.status !== 0) return [];
  return (result.stdout || "")
    .split("\\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitChangedPaths(cwd) {
  const root = gitRoot(cwd);
  if (!root) {
    return { root: "", paths: [] };
  }
  const result = safeSpawn(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    root,
  );
  if (!result || result.status !== 0) {
    return { root, paths: [] };
  }
  const paths = [];
  for (const raw of (result.stdout || "").split("\\n")) {
    const line = raw.trimEnd();
    if (!line) continue;
    const payload = line.slice(3).split(" -> ").at(-1) || "";
    if (payload) paths.push(normalizePath(payload));
  }
  return { root, paths };
}

function classifyPath(file) {
  const path = normalizePath(file);
  const doc = DOC_PATH_PATTERNS.some((pattern) => pattern.test(path));
  const test = TEST_PATH_PATTERNS.some((pattern) => pattern.test(path));
  const meta = META_PATH_PATTERNS.some((pattern) => pattern.test(path));
  return {
    path,
    doc,
    test,
    meta,
    production: !doc && !test && !meta,
  };
}

function readChangedFile(root, file) {
  if (!root || !file) return "";
  try {
    return readFileSync(join(root, file), "utf8");
  } catch {
    return "";
  }
}

function hasPrototypeScaffolding(root, files) {
  for (const file of files) {
    const content = readChangedFile(root, file.path);
    if (!content) continue;
    if (PROTOTYPE_PATTERNS.some((pattern) => pattern.test(content))) {
      return file.path;
    }
  }
  return "";
}

function explanationOnly(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return true;
  return EXPLANATION_ONLY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function resolveFieldValue(rule, output) {
  const args =
    output.args && typeof output.args === "object"
      ? output.args
      : null;
  if (!args) {
    return null;
  }
  const value = args[rule.field];
  return typeof value === "string" ? value : null;
}

function resolveCommandCwd(output) {
  const args =
    output.args && typeof output.args === "object"
      ? output.args
      : null;
  const cwd = args?.cwd;
  return typeof cwd === "string" && cwd ? cwd : process.cwd();
}

function hasRtkBinary() {
  try {
    const result = spawnSync("rtk", ["--version"], { encoding: "utf8", timeout: 3000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

function findRepoRtkMd(startCwd) {
  let current = resolve(startCwd || process.cwd());
  while (true) {
    const candidate = join(current, "RTK.md");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return "";
}

function findHomeRtkMd() {
  const home = process.env.HOME || "";
  if (!home) return "";
  for (const relativePath of RTK_HOME_PATHS) {
    const candidate = join(home, relativePath);
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

function getRtkRewrite(command, cwd) {
  if (!command || /^\\s*rtk\\b/.test(command)) return null;
  if (!(findRepoRtkMd(cwd) || findHomeRtkMd())) return null;
  if (!hasRtkBinary()) return null;
  try {
    const result = spawnSync("rtk", ["rewrite", command], {
      cwd,
      encoding: "utf8",
      timeout: 3000,
    });
    const rewritten = (result.stdout || "").trim();
    return result.status === 0 && rewritten && rewritten !== command ? rewritten : null;
  } catch {
    return null;
  }
}

function recordEvidence(state, value) {
  if (!value) return;
  if (!state.evidence.includes(value)) {
    state.evidence.push(value);
  }
}

function extractTaskID(output) {
  const text = typeof output?.output === "string" ? output.output : "";
  const match = text.match(/task_id:\\s*([^\\s]+)/);
  return match?.[1] || "";
}

function detectTaggedAgent(message) {
  const text = typeof message?.content === "string" ? message.content : "";
  const match = text.match(/@([a-z][a-z0-9_-]+)/i);
  if (!match) return "";
  return match[1];
}

function blocked(reason) {
  return \`BLOCKED: \${reason}\`;
}

function evaluateCompletion(sessionID, text) {
  const state = getSessionState(sessionID);
  const contract = state.contract;
  if (!contract) return text;
  if (/^BLOCKED:/m.test(text)) return text;

  const diff = gitChangedPaths(state.cwd);
  const classified = diff.paths.map(classifyPath);
  const production = classified.filter((item) => item.production);
  const docs = classified.filter((item) => item.doc);
  const tests = classified.filter((item) => item.test);
  const meta = classified.filter((item) => item.meta);

  if (contract.routeKind === "edit-required") {
    if (production.length === 0) {
      const changed = [...docs, ...tests, ...meta].map((item) => item.path).slice(0, 6);
      if (changed.length > 0) {
        return blocked(
          \`openagentsbtw required production-code edits for route \${state.route}; only docs/tests/meta files changed: \${changed.join(", ")}\`,
        );
      }
      return blocked(
        \`openagentsbtw required production-code edits for route \${state.route}; no qualifying repo changes were detected\`,
      );
    }

    const prototypeFile = hasPrototypeScaffolding(diff.root, production);
    if (prototypeFile) {
      return blocked(
        \`openagentsbtw rejected prototype/demo scaffolding in production path \${prototypeFile}\`,
      );
    }

    if (explanationOnly(text) && state.evidence.length === 0) {
      return blocked(
        \`openagentsbtw required actual implementation work for route \${state.route}; the final response was explanation-only\`,
      );
    }
  }

  if (contract.routeKind === "execution-required") {
    if (state.evidence.length === 0) {
      return blocked(
        \`openagentsbtw required execution evidence for route \${state.route}; no test or command execution was recorded\`,
      );
    }
  }

  return text;
}

function routeFromAgent(agent) {
  if (!agent) return undefined;
  return AGENT_CONTRACTS[agent] || NATIVE_AGENT_CONTRACTS[agent];
}

const openAgentsPlugin = async () => ({
  "chat.message": async (input, output) => {
    const state = getSessionState(input.sessionID);
    if (input.agent) {
      state.agent = input.agent;
      mergeContract(state, input.agent, routeFromAgent(input.agent));
    }
    const tagged = detectTaggedAgent(output.message);
    if (tagged) {
      mergeContract(state, tagged, routeFromAgent(tagged));
    }
  },

  "command.execute.before": async (input) => {
    const state = getSessionState(input.sessionID);
    state.command = input.command;
    mergeContract(state, input.command, COMMAND_CONTRACTS[input.command]);
  },

  "tool.execute.before": async (input, output) => {
    const state = getSessionState(input.sessionID);
    state.cwd = resolveCommandCwd(output);

    if (input.tool === "task") {
      const subagent =
        output.args && typeof output.args === "object" && typeof output.args.subagent_type === "string"
          ? output.args.subagent_type
          : "";
      if (subagent) {
        mergeContract(state, subagent, routeFromAgent(subagent));
      }
    }

    for (const rule of BEFORE_RULES) {
      if (!rule.tools.includes(input.tool)) {
        continue;
      }
      const value = resolveFieldValue(rule, output);
      if (!value) {
        continue;
      }
      const normalized = rule.field === "command" ? value.trim() : value;
      if (rule.kind === "rtk-rewrite") {
        const rewritten = getRtkRewrite(normalized, resolveCommandCwd(output));
        if (rewritten) {
          throw new Error(\`\${rule.message}. Use: \${rewritten}\`);
        }
        continue;
      }
      if (rule.patterns.some((pattern) => pattern.test(normalized))) {
        throw new Error(rule.message);
      }
    }
  },

  "tool.execute.after": async (input, output) => {
    const state = getSessionState(input.sessionID);
    if (input.tool === "bash") {
      const command =
        typeof input.args?.command === "string" ? input.args.command.trim() : "";
      if (command) recordEvidence(state, \`bash:\${command}\`);
    }
    if (input.tool === "task") {
      const subagent =
        typeof input.args?.subagent_type === "string" ? input.args.subagent_type : "";
      if (subagent) {
        recordEvidence(state, \`task:\${subagent}\`);
      }
      const taskID = extractTaskID(output);
      if (taskID && !state.taskIDs.includes(taskID)) {
        state.taskIDs.push(taskID);
      }
    }
  },

  "experimental.session.compacting": async (input, output) => {
    const state = getSessionState(input.sessionID);
    const branch = gitBranch(state.cwd);
    const recent = gitRecent(state.cwd);
    const gitBits = [
      branch ? \`Branch: \${branch}\` : "",
      recent.length ? \`Recent commits: \${recent.join(" | ")}\` : "",
    ].filter(Boolean);

    output.context.push(
      "Preserve objective execution state. Keep the user goal, active route contract, concrete edits/tests/commands performed, blockers, remaining next actions, and relevant files. Drop emotional framing, tutorial filler, placeholders, and speculative TODO plans."
    );
    if (state.route && state.contract) {
      output.context.push(
        \`Active route: \${state.route} (contract: \${state.contract.routeKind})\`,
      );
    }
    if (state.evidence.length) {
      output.context.push(\`Execution evidence: \${state.evidence.join(" | ")}\`);
    }
    if (state.taskIDs.length) {
      output.context.push(\`Active task_ids: \${state.taskIDs.join(", ")}\`);
    }
    if (gitBits.length) {
      output.context.push(gitBits.join("\\n"));
    }
  },

  "experimental.text.complete": async (input, output) => {
    output.text = evaluateCompletion(input.sessionID, output.text);
  },
});

export default openAgentsPlugin;
`;
}
