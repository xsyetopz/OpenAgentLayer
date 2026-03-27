import type { Plugin } from "@opencode-ai/plugin";

const BEFORE_RULES = [
  {
    id: "bash-guard",
    tools: ["bash"],
    field: "command",
    message: "openagentsbtw blocked a dangerous bash command",
    patterns: [/\brm\s+-rf\s+\/$/, /\bgit\s+add\s+\.\b/, /\bgit\s+commit\b/, /\bgit\s+push\b/],
  },
  {
    id: "secret-path-guard",
    tools: ["read","edit","write"],
    field: "filePath",
    message: "openagentsbtw blocked access to a secret-like file",
    patterns: [/(^|\/)(\.env($|\.)|.*\.(pem|key))$/i],
  },
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
