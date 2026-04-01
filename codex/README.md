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
./install.sh --codex --codex-deepwiki
./install.sh --codex --chrome-devtools-mcp
./install.sh --codex --browsermcp
```

Wrapper command after install:

```bash
~/.codex/openagentsbtw/bin/oabtw-codex docs "tighten the README install section"
~/.codex/openagentsbtw/bin/oabtw-codex deepwiki "map the auth subsystem before editing it"
~/.codex/openagentsbtw/bin/oabtw-codex implement "fix the auth race in src/auth.ts"
~/.codex/openagentsbtw/bin/oabtw-codex review "audit the current diff for regressions"
~/.codex/openagentsbtw/bin/oabtw-codex memory show
```

`oabtw-codex` is the short alias. `openagentsbtw-codex` remains the canonical equivalent and is installed alongside it.

The installer:

- copies the plugin payload into `~/.codex/plugins/openagentsbtw`
- registers a personal plugin marketplace entry in `~/.agents/plugins/marketplace.json`
- enables the plugin in `~/.codex/config.toml` under `[plugins."openagentsbtw@openagentsbtw-local"]` (if not already present)
- installs custom agents into `~/.codex/agents/`
- installs hook scripts into `~/.codex/openagentsbtw/hooks/` and merges `~/.codex/hooks.json`
- keeps openagentsbtw memory state in `~/.codex/openagentsbtw/state/`
- appends managed openagentsbtw guidance to `~/.codex/AGENTS.md`
- appends managed `openagentsbtw-plus`, `openagentsbtw-pro`, `openagentsbtw-codex-mini`, `openagentsbtw`, and `openagentsbtw-accept-edits` profiles to `~/.codex/config.toml`
- optionally appends a managed `mcp_servers.deepwiki` block to `~/.codex/config.toml`
- optionally appends managed `mcp_servers.chrome-devtools` and `mcp_servers.browsermcp` blocks to `~/.codex/config.toml`
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
- `~/.codex/openagentsbtw/state/`
- managed openagentsbtw blocks in `~/.codex/config.toml` and `~/.codex/AGENTS.md`

Important:

- The supported update path is reinstall-from-repo.
- This is how users get additions and removals, not just new files.
- There is no separate openagentsbtw-specific in-app updater for Codex in this repo flow.

The plugin package gives Codex the skills and install surface. Default behavior comes from `AGENTS.md`, the managed profiles, enabled hooks, and the `openagentsbtw-codex` wrapper.

As of this package version, the wrappers also auto-attach the plugin by prepending `$openagentsbtw` to the prompt when the plugin is installed under `~/.codex/plugins/openagentsbtw`. This avoids having to manually invoke the plugin in normal wrapper-driven workflows.

## Model Presets

- `plus`
  Default preset. Uses `gpt-5.2` for planning/default sessions, `gpt-5.2-codex` for implementation-heavy paths, and `gpt-5.4-mini` for lighter secondary roles.
- `pro`
  Explicit opt-in preset. Uses `gpt-5.4` for `athena` and `odysseus`, while coding and review paths remain on the `5.2` split.
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

- `oabtw-codex explore|trace|debug|plan|implement|review|orchestrate|deepwiki` is the short supported CLI routing layer.
- `oabtw-codex accept` is the sandboxed auto-accept implementation route.
- `oabtw-codex memory show|forget-project|prune` manages the openagentsbtw SQLite memory overlay.
- `openagentsbtw-codex` remains supported as the canonical full-form command.
- Wrapper modes select the managed profile, add per-mode model overrides where needed, and reinforce the intended specialist path.
- `deepwiki` is explicit and opt-in. It is for GitHub repo exploration through the configured DeepWiki MCP server, not a replacement for normal local repo reads.
- Native `/plan` still helps with reasoning depth, but it does not guarantee `athena` selection.
- Specialist model pinning lives in the installed custom agent TOMLs, not in the plugin manifest.

## Safety Model

- Codex safety is centered on sandboxing, approvals, writable roots, rules, project trust, and hooks.
- This is similar in outcome to Claude Code’s permissions, but not the same implementation shape.
- Current Codex hooks intercept Bash, not a broad built-in edit/write/read tool matrix.

## Memory

- Codex already has native SQLite-backed state persistence and saved sessions.
- openagentsbtw adds a second, explicit project-memory DB at `~/.codex/openagentsbtw/state/memory.sqlite`.
- SessionStart loads the current project's recap and recent session notes.
- UserPromptSubmit adds a lightweight project-memory hint during active work.
- Stop writes a bounded deterministic summary for later recall.
- If Codex does not expose a transcript path, the turn still runs, but openagentsbtw warns that memory was skipped for that turn.

## Notes

- The Codex plugin is packaged with the official `.codex-plugin/plugin.json` manifest and local marketplace metadata.
- The hook port intentionally keeps only what Codex’s documented hook events can support today: Bash command guardrails, Bash output redaction, session guidance, and completion checks.
- Research and source links for the Codex port live in `docs/openai/`.
