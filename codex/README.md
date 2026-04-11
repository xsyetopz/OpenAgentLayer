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
./install.sh --codex --codex-plan go
./install.sh --codex --codex-plan plus
./install.sh --codex --codex-plan pro-5
./install.sh --codex --codex-plan pro-20
./install.sh --codex --caveman-mode full
./install.sh --deepwiki-mcp
./install.sh --playwright-cli
```

Wrapper command after install:

```bash
oabtw-codex docs "tighten the README install section"
oabtw-codex qa "reproduce this bug broadly and record the variants"
oabtw-codex resume --last
oabtw-codex-peer batch "investigate, implement, test, and review this change"
```

Direct fallback path:

```bash
~/.codex/openagentsbtw/bin/oabtw-codex docs "tighten the README install section"
~/.codex/openagentsbtw/bin/oabtw-codex deepwiki "map the auth subsystem before editing it"
~/.codex/openagentsbtw/bin/oabtw-codex implement "fix the auth race in src/auth.ts"
~/.codex/openagentsbtw/bin/oabtw-codex review "audit the current diff for regressions"
~/.codex/openagentsbtw/bin/oabtw-codex qa "reproduce this bug broadly and record the variants"
~/.codex/openagentsbtw/bin/oabtw-codex longrun "run the full integration suite and wait for it cleanly"
~/.codex/openagentsbtw/bin/oabtw-codex swarm "investigate, implement, test, and review this change"
~/.codex/openagentsbtw/bin/oabtw-codex-peer batch "investigate, implement, test, and review this change"
~/.codex/openagentsbtw/bin/oabtw-codex memory show
```

`oabtw-codex` is the short alias. `openagentsbtw-codex` remains the canonical equivalent and is installed alongside it.

The installer:

- copies the plugin payload into `~/.codex/plugins/openagentsbtw`
- registers a personal plugin marketplace entry in `~/.agents/plugins/marketplace.json`
- enables the plugin in `~/.codex/config.toml` under `[plugins."openagentsbtw@openagentsbtw-local"]` (if not already present)
- installs custom agents into `~/.codex/agents/`
- installs hook scripts into `~/.codex/openagentsbtw/hooks/` and merges `~/.codex/hooks.json`
- installs PATH-managed wrapper shims into `~/.local/bin/` on Unix or `%APPDATA%\\openagentsbtw\\bin\\` on Windows
- keeps openagentsbtw memory state in `~/.codex/openagentsbtw/state/`
- appends managed openagentsbtw guidance to `~/.codex/AGENTS.md`
- appends global native continuity defaults (`sqlite_home`, `history`, `memories`, `compact_prompt`, `hide_agent_reasoning`, `tool_output_token_limit`) plus a plan-aware `openagentsbtw` main profile, a matching `openagentsbtw-<plan>` alias, `openagentsbtw-codex-mini`, `openagentsbtw-accept-edits`, and `openagentsbtw-longrun` to `~/.codex/config.toml`
- optionally appends a managed `mcp_servers.deepwiki` block to `~/.codex/config.toml`
- optionally installs RTK and a managed `~/.config/openagentsbtw/RTK.md` policy

## Updating

Use this when you want new features, removals, or changed defaults:

```bash
git pull
./install.sh --codex
```

If you use a specific plan, repeat it:

```bash
./install.sh --codex --codex-plan pro-20
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

openagentsbtw installs a `UserPromptSubmit` hook that injects lightweight git context plus a compact project-memory hint during active work. Prefix a prompt with `!raw` to opt out for that one turn. Hooks do not “run” skills; reliable role routing comes from `AGENTS.md` guidance and the wrapper commands.

If managed Caveman mode is enabled, Codex also gets terse response shaping through the session hooks. That compression applies to assistant prose only; code, commands, docs, review findings, and commit messages stay normal unless the explicit Caveman skill is invoked. Change the shared default with `./config.sh --caveman-mode <mode>`, or disable future sessions with `./config.sh --caveman-mode off`.

Wrappers no longer prepend `$openagentsbtw`. The managed profiles enable the plugin via `~/.codex/config.toml`, and hooks inject git/memory context automatically.

## Model Presets

- `go`
  Budget-first preset. Keeps the main route on `gpt-5.4-mini`, uses `gpt-5.3-codex` for implementation, and stays conservative about swarming.
- `plus`
  Code-specialized preset. Uses `gpt-5.3-codex` for the main route and `gpt-5.4-mini` for bounded utility work.
- `pro-5`
  High-reasoning preset. Uses `gpt-5.2` for planning/review/orchestration, `gpt-5.3-codex` for implementation, and `gpt-5.3-codex-spark` for Pro-only utility work.
- `pro-20`
  Same model split as `pro-5`, with stronger reasoning on the main route and more aggressive swarming.
- `openagentsbtw-codex-mini`
  A separate lightweight profile for narrow high-volume tasks. It uses Spark on the Pro plans and `gpt-5.4-mini` on `go` / `plus`.
- `openagentsbtw-accept-edits`
  A sandboxed auto-accept profile for implementation work. It keeps `sandbox_mode = "workspace-write"` but switches to `approval_policy = "never"`.
- `openagentsbtw-longrun`
  A patient long-running execution profile. It keeps the implementation route, enables `unified_exec`, prevents idle sleep, and raises the background terminal timeout for long builds and test suites.

## Behavior Policy

- Responses should read like the old CCA style: direct, terse, and evidence-first.
- Start with the answer, decision, or action. Do not restate the prompt or narrate intent.
- No praise, apology loops, or trailing optional-offer boilerplate.
- If the user's premise is wrong, say so directly and explain why.
- If something is uncertain, say `UNKNOWN` and state what would resolve it.
- No placeholders, "for now", "future PR", or deferred core work unless the user explicitly narrows scope.
- Internal code comments explain non-obvious why only. Narrating or educational comments are rejected by the Codex completion scan.

## Routing

- `oabtw-codex explore|trace|debug|qa|plan|implement|review|longrun|orchestrate|deepwiki|resume` is the short supported CLI routing layer.
- `oabtw-codex accept` is the sandboxed auto-accept implementation route.
- `oabtw-codex-peer batch|tmux` is the openagentsbtw-managed peer-thread helper. It runs top-level Codex workers; it is not a native Codex subagent feature.
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
- openagentsbtw installs native continuity defaults so `codex resume` and `oabtw-codex resume` continue from the same persisted thread state by default.
- openagentsbtw adds a second, explicit project-memory DB at `~/.codex/openagentsbtw/state/memory.sqlite`.
- SessionStart loads the current project's recap and recent session notes.
- UserPromptSubmit adds lightweight git context and a compact project-memory hint during active work.
- Stop writes a bounded deterministic summary for later recall.
- If Codex does not expose a transcript path, the turn still runs, but openagentsbtw warns that memory was skipped for that turn.

## Notes

- The Codex plugin is packaged with the official `.codex-plugin/plugin.json` manifest and local marketplace metadata.
- The hook port intentionally keeps only what Codex’s documented hook events can support today: Bash command guardrails, Bash output redaction, session guidance, and completion checks.
- Research and source links for the Codex port live in `docs/openai/`.
