# openagentsbtw Codex

This package ports openagentsbtw onto Codex’s native extension surfaces: custom agents, plugins, hooks, `AGENTS.md`, and a Codex profile. The Codex-facing agent files, skill files, and hook manifest are generated from the shared root `source/` tree.

## Layout

- `plugin/openagentsbtw/` contains the Codex plugin manifest and bundled skills.
- `agents/` contains custom agent TOML files for `athena`, `hephaestus`, `nemesis`, `atalanta`, `calliope`, `hermes`, and `odysseus`.
- `hooks/` contains Codex-compatible hook definitions and scripts.
- `templates/` contains example `AGENTS.md` and `config.toml` snippets.

## Install

```bash
./install.sh --codex
./install.sh --codex --codex-tier plus
./install.sh --codex --codex-tier pro
```

Wrapper command after install:

```bash
~/.codex/openagentsbtw/bin/openagentsbtw-codex docs "tighten the README install section"
~/.codex/openagentsbtw/bin/openagentsbtw-codex implement "fix the auth race in src/auth.ts"
~/.codex/openagentsbtw/bin/openagentsbtw-codex review "audit the current diff for regressions"
```

The installer:

- copies the plugin payload into `~/.codex/plugins/openagentsbtw`
- registers a personal plugin marketplace entry in `~/.agents/plugins/marketplace.json`
- installs custom agents into `~/.codex/agents/`
- installs hook scripts into `~/.codex/openagentsbtw/hooks/` and merges `~/.codex/hooks.json`
- appends managed openagentsbtw guidance to `~/.codex/AGENTS.md`
- appends managed `openagentsbtw-plus`, `openagentsbtw-pro`, `openagentsbtw-codex-mini`, and selected `openagentsbtw` profiles to `~/.codex/config.toml`
- optionally runs `rtk init -g --codex`

## Model Presets

- `plus`
  Uses `gpt-5.3-codex` for the heavy coding/planning roles and `gpt-5.4-mini` for lighter roles.
- `pro`
  Uses `gpt-5.4` for `athena` and `odysseus`, `gpt-5.3-codex` for the main coding roles, and `gpt-5.4-mini` for lighter roles.
- `openagentsbtw-codex-mini`
  A separate lightweight profile for narrow high-volume tasks using `gpt-5.1-codex-mini`. It is installed for manual use rather than assigned as a default role.

## Behavior Policy

- Responses should read like a peer developer, not a therapist or support agent.
- No praise, apology loops, or trailing `if you want...` boilerplate.
- No placeholders, "for now", "future PR", or deferred core work unless the user explicitly narrows scope.
- Internal code comments explain non-obvious why only. Narrating or educational comments are rejected by the Codex completion scan.

## Notes

- The Codex plugin is packaged with the official `.codex-plugin/plugin.json` manifest and local marketplace metadata.
- The hook port intentionally keeps only what Codex’s documented hook events can support today: Bash command guardrails, Bash output redaction, session guidance, and completion checks.
- Research and source links for the Codex port live in `docs/openai/`.
