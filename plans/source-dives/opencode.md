# OpenCode Source Dive

Repository: https://github.com/anomalyco/opencode
Status: source-backed research for v4 planning.

## Source Paths

- `packages/opencode/src/config/config.ts` — config state loading and merge order.
- `packages/opencode/src/config/agent.ts` — agent/mode loading.
- `packages/opencode/src/config/skills.ts` — skill discovery.
- `packages/opencode/src/config/plugin.ts` — plugin resolution.
- `packages/opencode/src/config/permission.ts` — permission schema.
- `packages/opencode/src/config/mcp.ts` — MCP config.
- `packages/opencode/src/config/paths.ts` — platform paths.
- `packages/web/src/content/docs/config.mdx` — public config documentation.

## Relevant Behaviors

- Config sources include remote, global, env/custom, project, `.opencode`, inline env, account, and managed layers.
- Agents can load from `agents/` or `modes/` style directories.
- Skills can load from OpenCode, Claude, and generic agents skill paths.
- Plugins can be local or package-based.
- Permissions classify tools such as read, edit, bash, and skill.
- MCP is config-backed.
- Tool output and compaction settings are native concepts and should be mapped into v4 token economy.

## v4 Implications

- Use managed config only with explicit precedence tests.
- Avoid package plugin installs unless user explicitly opts in.
- Render skills into the most native OpenCode path.
- Generate permissions so the harness runner is allowed while unsafe shell remains gated.
- Validate compaction and truncation effects.

## Edge Cases

- Skills in `.claude` or `.agents` may be discovered by OpenCode and collide with v4 names.
- Managed config can override project config; user intent must remain visible.
- Plugin loading may imply network or package manager side effects.
- Tool permission deny rules may block generated workflows if too broad.

