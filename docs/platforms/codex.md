# Codex Adapter

Codex is a primary adapter.

Native surfaces:

- `AGENTS.md`
- config
- hooks
- skills
- subagents/custom agents
- commands where supported
- MCP config

Adapter rules:

- Keep `AGENTS.md` short.
- Render hooks as self-contained installed artifacts.
- Use current supported model IDs only.
- Treat config precedence and tool-output limits as runtime constraints.
- Fail checks when required hook support is missing.

Source spec: `source/platforms/codex.toml`.
