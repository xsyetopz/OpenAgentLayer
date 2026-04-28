# Source Schemas

Canonical source files:

- `source/product.toml` — product name, CLI, runner, support policy, docs pointers.
- `source/models.toml` — Codex/OpenCode models, route defaults, fallbacks.
- `source/runner.toml` — shell policy, RTK probing, token accounting, filter defaults.
- `source/integrations.toml` — package manager detection, RTK, Context7, Caveman capabilities.
- `source/providers.toml` — exact upstream providers, sync mode, install/probe, provenance paths.
- `source/tools.toml` — direct tool probes, macOS/Linux install commands, use policy.
- `source/agents.toml` — role catalog.
- `source/skills.toml` — skill catalog.
- `source/commands.toml` — command catalog.
- `source/hooks.toml` — hook catalog.
- `source/platforms/*.toml` — native surfaces, generated paths, install paths, validation.

`oal check source` must parse these as typed TOML.
