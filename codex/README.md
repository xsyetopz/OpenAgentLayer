# openagentsbtw Codex

This package ports openagentsbtw onto Codex’s native extension surfaces: custom agents, plugins, hooks, `AGENTS.md`, config, and wrapper commands. The Codex-facing agent files, skill files, and hook manifest are generated from the shared root `source/` tree.

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
~/.codex/openagentsbtw/bin/oabtw-codex docs "tighten the README install section"
~/.codex/openagentsbtw/bin/oabtw-codex implement "fix the auth race in src/auth.ts"
~/.codex/openagentsbtw/bin/oabtw-codex review "audit the current diff for regressions"
```

`oabtw-codex` is the short alias. `openagentsbtw-codex` remains the canonical equivalent and is installed alongside it.

The installer:

- copies the plugin payload into `~/.codex/plugins/openagentsbtw`
- registers a personal plugin marketplace entry in `~/.agents/plugins/marketplace.json`
- installs custom agents into `~/.codex/agents/`
- installs hook scripts into `~/.codex/openagentsbtw/hooks/` and merges `~/.codex/hooks.json`
- appends managed openagentsbtw guidance to `~/.codex/AGENTS.md`
- appends managed `openagentsbtw-plus`, `openagentsbtw-pro`, `openagentsbtw-codex-mini`, `openagentsbtw`, and `openagentsbtw-accept-edits` profiles to `~/.codex/config.toml`
- optionally runs `rtk init -g --codex`

## Updating

Use this when you want new features, removals, or changed defaults:

```bash
git pull
./install.sh --codex
```

If you use a specific tier, repeat it:

```bash
./install.sh --codex --codex-tier pro
```

What gets refreshed:

- `~/.codex/plugins/openagentsbtw`
- `~/.codex/agents/`
- `~/.codex/openagentsbtw/hooks/`
- `~/.codex/openagentsbtw/bin/`
- managed openagentsbtw blocks in `~/.codex/config.toml` and `~/.codex/AGENTS.md`

Important:

- The supported update path is reinstall-from-repo.
- This is how users get additions and removals, not just new files.
- There is no separate openagentsbtw-specific in-app updater for Codex in this repo flow.

The plugin package gives Codex the skills and install surface. Default behavior comes from `AGENTS.md`, the managed profiles, enabled hooks, and the `openagentsbtw-codex` wrapper.

## Model Presets

- `plus`
  Uses `gpt-5.3-codex` for the heavy coding/planning roles and `gpt-5.4-mini` for lighter roles.
- `pro`
  Uses `gpt-5.4` for `athena` and `odysseus`, `gpt-5.3-codex` for the main coding roles, and `gpt-5.4-mini` for lighter roles.
- `openagentsbtw-codex-mini`
  A separate lightweight profile for narrow high-volume tasks using `gpt-5.1-codex-mini`. It is installed for manual use rather than assigned as a default role.
- `openagentsbtw-accept-edits`
  A sandboxed auto-accept profile for implementation work. It keeps `sandbox_mode = "workspace-write"` but switches to `approval_policy = "never"`.

## Behavior Policy

- Responses should read like the old CCA style: direct, terse, and evidence-first.
- Start with the answer, decision, or action. Do not restate the prompt or narrate intent.
- No praise, apology loops, or trailing `if you want...` boilerplate.
- If the user's premise is wrong, say so directly and explain why.
- If something is uncertain, say `UNKNOWN` and state what would resolve it.
- No placeholders, "for now", "future PR", or deferred core work unless the user explicitly narrows scope.
- Internal code comments explain non-obvious why only. Narrating or educational comments are rejected by the Codex completion scan.

## Routing

- `oabtw-codex plan|implement|review|orchestrate` is the short supported CLI routing layer.
- `oabtw-codex accept` is the sandboxed auto-accept implementation route.
- `openagentsbtw-codex` remains supported as the canonical full-form command.
- Wrapper modes select the managed profile and reinforce the intended specialist path.
- Native `/plan` still helps with reasoning depth, but it does not guarantee `athena` selection.
- Specialist model pinning lives in the installed custom agent TOMLs, not in the plugin manifest.

## Safety Model

- Codex safety is centered on sandboxing, approvals, writable roots, rules, project trust, and hooks.
- This is similar in outcome to Claude Code’s permissions, but not the same implementation shape.
- Current Codex hooks intercept Bash, not a broad built-in edit/write/read tool matrix.

## Notes

- The Codex plugin is packaged with the official `.codex-plugin/plugin.json` manifest and local marketplace metadata.
- The hook port intentionally keeps only what Codex’s documented hook events can support today: Bash command guardrails, Bash output redaction, session guidance, and completion checks.
- Research and source links for the Codex port live in `docs/openai/`.
