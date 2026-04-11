# Codex Config

Codex uses `~/.codex/config.toml` for user defaults and `.codex/config.toml` for repo overrides. CLI flags override both at runtime. Sources: [config-basic](https://developers.openai.com/codex/config-basic), [config-reference](https://developers.openai.com/codex/config-reference), [config-sample](https://developers.openai.com/codex/config-sample)

## Managed Profiles

openagentsbtw appends a managed profile block to `~/.codex/config.toml`:

| Profile                      | Purpose                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `openagentsbtw`              | Main route, model from selected plan                        |
| `openagentsbtw-<plan>`       | Plan alias (Codex: go/plus/pro-5/pro-20)                    |
| `openagentsbtw-implement`    | Stable implementation profile for wrapper routes            |
| `openagentsbtw-codex-mini`   | Lightweight tasks (Spark on Pro, mini on go/plus)           |
| `openagentsbtw-accept-edits` | Sandboxed auto-approval                                     |
| `openagentsbtw-longrun`      | Patient builds/tests with `unified_exec` and higher timeout |

The plugin is enabled via config:

```toml
[plugins."openagentsbtw@openagentsbtw-local"]
enabled = true
```

### Shared Defaults

All managed profiles use:

- `model_verbosity = "low"`
- `personality = "none"`
- `sandbox_mode = "workspace-write"`
- `codex_hooks = true`
- `sqlite = true`
- `multi_agent = true`
- `fast_mode = false`
- `model_reasoning_effort = "medium"`
- tier-shaped `plan_mode_reasoning_effort` (`high` on `go`; `xhigh` on `plus`, `pro-5`, and `pro-20`; `medium` on codex-mini)
- `model_reasoning_summary = "none"` (top-level)

### Approval Policy

- Main, codex-mini, and named plan profiles: `approval_policy = "on-request"`
- accept-edits: `approval_policy = "never"`

### Wrapper Routing

| Mode                            | Profile                      |
| ------------------------------- | ---------------------------- |
| `plan`, `review`, `orchestrate` | `openagentsbtw`              |
| `implement`                     | `openagentsbtw-implement`    |
| `accept`                        | `openagentsbtw-accept-edits` |
| `qa`                            | `openagentsbtw-codex-mini`   |
| `longrun`                       | `openagentsbtw-longrun`      |
| Bounded utility modes           | `openagentsbtw-codex-mini`   |

## Plan Mode

`plan_mode_reasoning_effort` only changes reasoning depth inside native plan mode. It does not bind `/plan` to a specific custom agent. openagentsbtw uses wrapper commands plus custom agent TOMLs for role-shaped routing.

## Fast Mode

Disabled in managed profiles. The system depends on deeper planning, stronger review, and predictable hook execution. `service_tier` is left unset by default; `service_tier = "fast"` is reserved for explicit fast wrapper routes. Sources: [speed](https://developers.openai.com/codex/speed), [config-reference](https://developers.openai.com/codex/config-reference)

## Long-Run Profile

Dedicated `openagentsbtw-longrun` profile for builds and test suites:

- `features.unified_exec = true`
- `features.prevent_idle_sleep = true`
- `background_terminal_max_timeout = 7200`

Use when the job is legitimately long. The model won't kill a healthy process without failure evidence.

## Memory Layer

openagentsbtw layers project-specific recall on top of native Codex SQLite persistence:

- Native Codex SQLite: runtime/session state
- `~/.codex/openagentsbtw/state/memory.sqlite`: per-project memory

Hook flow:
- SessionStart: loads project recap + recent session notes
- UserPromptSubmit: adds project-memory hint during active work
- Stop: persists bounded session summary

If native SQLite or history persistence is disabled, the startup hook warns that cross-session recall will be weakened.

## Attribution

`commit_attribution` is set once in the managed block (top-level, not per-profile). Set empty string to disable. Response style is driven by `AGENTS.md` and agent TOMLs, not a personality overlay.

## Install Behavior

The installer appends a managed block rather than rewriting the whole file. During interactive install, it asks whether to set a top-level `profile = ...` default. For automation: `--codex-set-top-profile` / `--no-codex-set-top-profile`. In CI, defaults to `pro-5` and only sets `profile` when none exists.

## Safety Model

Codex enforces safety through `sandbox_mode`, `approval_policy`, writable roots, rules, project trust, and hooks -- not Claude's `allow`/`ask`/`deny` permission matrix. Good at sandbox and approval boundaries; not a one-for-one port of Claude's per-tool permission patterns.

## AGENTS.md

Codex's primary project-instruction surface. openagentsbtw uses real `AGENTS.md` files, not `CLAUDE.md` symlinks. Source: [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)

## Optional Surfaces

### DeepWiki MCP

Opt-in via `./install.sh --deepwiki-mcp`. Writes config to `~/.codex/config.toml`. Toggle post-install with `./config.sh --deepwiki` / `--no-deepwiki`. Only useful for GitHub repos that DeepWiki can index.

### Context7 CLI

Opt-in via `./install.sh --ctx7-cli`. Writes managed `ctx7` wrapper to `~/.local/bin/ctx7`. API keys stored in `~/.config/openagentsbtw/config.env`. CLI-only; no managed MCP block.

### Playwright CLI

Opt-in via `./install.sh --playwright-cli`. Supports `playwright-cli install --skills` for repo-scoped browser automation.
