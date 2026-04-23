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
oabtw-codex document "tighten the README install section"
oabtw-codex validate "reproduce this bug broadly and record the variants"
oabtw-codex resume --last
oabtw-codex-peer batch "investigate, implement, test, and review this change"
```

Direct fallback path:

```bash
~/.codex/openagentsbtw/bin/oabtw-codex document "tighten the README install section"
~/.codex/openagentsbtw/bin/oabtw-codex explore --source deepwiki "map the auth subsystem before editing it"
~/.codex/openagentsbtw/bin/oabtw-codex implement "fix the auth race in src/auth.ts"
~/.codex/openagentsbtw/bin/oabtw-codex review "audit the current diff for regressions"
~/.codex/openagentsbtw/bin/oabtw-codex validate "reproduce this bug broadly and record the variants"
~/.codex/openagentsbtw/bin/oabtw-codex test --runtime long "run the full integration suite and wait for it cleanly"
~/.codex/openagentsbtw/bin/oabtw-codex orchestrate "investigate, implement, test, and review this change"
~/.codex/openagentsbtw/bin/oabtw-codex-peer batch "investigate, implement, test, and review this change"
~/.codex/openagentsbtw/bin/oabtw-codex memory show
oabtw-codex queue add "follow up after the current task"
oabtw-codex queue list
```

`oabtw-codex` is the short alias. `openagentsbtw-codex` remains the canonical equivalent and is installed alongside it.

The installer:

- copies the plugin payload into `~/.codex/plugins/openagentsbtw` and the active Codex plugin cache under `~/.codex/plugins/cache/openagentsbtw-local/openagentsbtw/<version>`
- registers a personal plugin marketplace entry in `~/.agents/plugins/marketplace.json` pointing at the concrete local plugin path
- enables the plugin in `~/.codex/config.toml` under `[plugins."openagentsbtw@openagentsbtw-local"]` (if not already present)
- installs custom agents into `~/.codex/agents/`
- installs hook scripts into `~/.codex/openagentsbtw/hooks/` and merges `~/.codex/hooks.json`
- installs PATH-managed wrapper shims into `~/.local/bin/` on Unix or `%APPDATA%\\openagentsbtw\\bin\\` on Windows
- keeps openagentsbtw memory state in `~/.codex/openagentsbtw/state/`
- appends managed openagentsbtw guidance to `~/.codex/AGENTS.md`
- appends global native continuity defaults (`sqlite_home`, `history`, `memories`, `compact_prompt`, `hide_agent_reasoning`, `tool_output_token_limit`) plus the managed `openagentsbtw`, `openagentsbtw-implement`, `openagentsbtw-utility`, `openagentsbtw-approval-auto`, and `openagentsbtw-runtime-long` profiles to `~/.codex/config.toml`
- optionally appends a managed `mcp_servers.deepwiki` block to `~/.codex/config.toml`
- optionally installs RTK, managed policy files at `~/.config/openagentsbtw/RTK.md` and `~/.codex/RTK.md`, and a managed `~/.codex/AGENTS.md` RTK reference

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

openagentsbtw installs a `UserPromptSubmit` hook that injects lightweight git context during active work. Project memory recap stays on `SessionStart`. Prefix a prompt with `!raw` to opt out for that one turn. Hooks do not “run” skills; reliable role routing comes from `AGENTS.md` guidance and the wrapper commands.

If managed Caveman mode is enabled, Codex also gets terse response shaping through the session hooks. That compression applies to assistant prose only; code, commands, docs, review findings, and commit messages stay normal unless the explicit Caveman skill is invoked. Change the shared default with `./config.sh --caveman-mode <mode>`, or disable future sessions with `./config.sh --caveman-mode off`.

Wrappers no longer prepend `$openagentsbtw`. The managed profiles enable the plugin via `~/.codex/config.toml`, and hooks inject git/memory context automatically.

## Model Presets

- Codex CLI 0.123.0 supported model set for openagentsbtw: `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex`, `gpt-5.3-codex-spark`, `gpt-5.2`.
- `go`
  Budget-first installer preset. It rewrites the managed `openagentsbtw*` profiles for lower cost routing while keeping the default profile name `openagentsbtw`.
- `plus`
  Code-specialized installer preset. It rewrites the managed `openagentsbtw*` profiles while keeping the default profile name `openagentsbtw`.
- `pro-5`
  High-reasoning installer preset. It rewrites the managed `openagentsbtw*` profiles while keeping the default profile name `openagentsbtw`.
- `pro-20`
  Same model split as `pro-5`, with more aggressive swarming. It is an installer preset, not a profile name.
- For `plus`, `pro-5`, and `pro-20`, top-level `openagentsbtw` defaults to `gpt-5.4` with `model_reasoning_effort = "medium"` and `plan_mode_reasoning_effort = "high"`. `go` keeps `gpt-5.4-mini` at top-level.
- Implementation/autopilot/long-runtime profiles stay on `gpt-5.3-codex`.
- `openagentsbtw-utility`
  A lightweight profile for bounded utility tasks. It uses `gpt-5.4-mini`.
- `openagentsbtw-approval-auto`
  A sandboxed auto-accept profile for implementation work. It keeps `sandbox_mode = "workspace-write"` but switches to `approval_policy = "never"`.
- `openagentsbtw-runtime-long`
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

- `oabtw-codex explore|trace|debug|validate|plan|implement|review|test|document|design-polish|orchestrate|resume` is the short supported CLI routing layer.
- `--approval auto`, `--speed fast`, `--runtime long`, and `--source deepwiki` are orthogonal wrapper modifiers.
- `oabtw-codex-peer batch|tmux` is the openagentsbtw-managed peer-thread helper. It runs top-level Codex workers; it is not a native Codex subagent feature.
- `oabtw-codex memory show|forget-project|prune` manages the openagentsbtw SQLite memory overlay.
- `oabtw-codex queue list|add|next|clear|retry` manages deferred prompt queue entries outside the repo.
- `openagentsbtw-codex` remains supported as the canonical full-form command.
- Wrapper modes select the managed profile, add per-mode model overrides where needed, and reinforce the intended specialist path.
- `--source deepwiki` is explicit and opt-in. It is for GitHub repo exploration through the configured DeepWiki MCP server, not a replacement for normal local repo reads.
- Native `/plan` still helps with reasoning depth, but it does not guarantee `athena` selection.
- Specialist model pinning lives in the installed custom agent TOMLs, not in the plugin manifest.

## Safety Model

- Codex safety is centered on sandboxing, approvals, writable roots, rules, project trust, and hooks.
- This is similar in outcome to Claude Code’s permissions, but not the same implementation shape.
- Current Codex hooks intercept Bash, not a broad built-in edit/write/read tool matrix.

## Memory

- Codex already has native SQLite-backed state persistence and saved sessions.
- openagentsbtw installs native continuity defaults so `codex resume` and `oabtw-codex resume` continue from the same persisted thread state by default.
- The top-level Codex profile remains `openagentsbtw` across plan presets. `go|plus|pro-5|pro-20` change the contents of the managed profiles; they do not create `openagentsbtw-go`, `openagentsbtw-plus`, `openagentsbtw-pro-5`, or `openagentsbtw-pro-20`.
- openagentsbtw adds a second, explicit project-memory DB at `~/.codex/openagentsbtw/state/memory.sqlite`.
- SessionStart loads the current project's recap and recent session notes.
- UserPromptSubmit adds lightweight git context during active work.
- Stop writes a bounded deterministic summary for later recall.
- If Codex does not expose a transcript path, the turn still runs, but openagentsbtw warns that memory was skipped for that turn.

## Deferred Prompt Queue

Use `/queue <message>` or `queue: <message>` to store a follow-up without letting it interrupt the active task. Use `/queue --auto <message>` only when the queued task should dispatch once after the current turn passes completion checks.

Queue state is stored outside the repo under `~/.config/openagentsbtw/queue/`, keyed by project identity. Existing stop-scan validation runs before queue drain, so rejected or blocked completions do not dispatch queued work.

## Notes

- The Codex plugin is packaged with the official `.codex-plugin/plugin.json` manifest and local marketplace metadata.
- The hook port intentionally keeps only what Codex’s documented hook events can support today: Bash command guardrails, Bash output redaction, session guidance, and completion checks.
- Research and source links for the Codex port live in `docs/platforms/codex.md`.
