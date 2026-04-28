# OpenCode Adapter

OpenCode is a primary adapter.

Native surfaces:

- config
- agents or modes
- skills
- permissions
- MCP config

Adapter rules:

- Prefer local generated files over package plugin installs.
- Use permissions to allow `oal-runner` and gate raw shell.
- Treat `.opencode`, `.claude`, and `.agents` discovery overlap as collision risk.
- Use local plugin behavior only when source-backed.

Source spec: `source/platforms/opencode.toml`.
