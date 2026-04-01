# Codex Config Notes

Codex supports both global and project config files. The basic flow is `~/.codex/config.toml` for user defaults plus `.codex/config.toml` for repo-specific overrides, with CLI flags able to override config at runtime. Sources: <https://developers.openai.com/codex/config-basic>, <https://developers.openai.com/codex/config-reference>, <https://developers.openai.com/codex/config-sample>

## openagentsbtw Profiles

openagentsbtw installs managed `openagentsbtw-plus`, `openagentsbtw-pro`, `openagentsbtw-codex-mini`, `openagentsbtw`, and `openagentsbtw-accept-edits` profiles into `~/.codex/config.toml` rather than overwriting arbitrary top-level user settings.

The installer also enables the plugin in Codex config by adding (or preserving) a plugin entry:

```toml
[plugins."openagentsbtw@openagentsbtw-local"]
enabled = true
```

- `openagentsbtw-plus`
  Defaults to `gpt-5.2` with high reasoning for the main interactive session.
- `openagentsbtw-pro`
  Defaults to `gpt-5.4` with high reasoning for the main interactive session.
- `openagentsbtw-codex-mini`
  Defaults to `gpt-5.1-codex-mini` with low reasoning for narrow high-volume work.
- `openagentsbtw`
  Tracks the selected install preset so users can still refer to one stable profile name.
- `openagentsbtw-accept-edits`
  Uses `gpt-5.2-codex` with high reasoning for sandboxed auto-accept implementation work.

The managed profiles share the same model/style defaults unless noted otherwise:

- `plan_mode_reasoning_effort = "high"` except the codex-mini profile, which stays low
- `model_verbosity = "medium"` except the codex-mini profile, which stays low
- `personality = "none"`
- `sandbox_mode = "workspace-write"` across every managed profile
- `service_tier = "flex"`
- `codex_hooks = true`
- `sqlite = true`
- `multi_agent = true`
- `fast_mode = false`

Approval policy splits by mode:

- `openagentsbtw-plus`, `openagentsbtw-pro`, `openagentsbtw-codex-mini`, and `openagentsbtw` use `approval_policy = "on-request"`
- `openagentsbtw-accept-edits` uses `approval_policy = "never"`

The matching repo sample is in `codex/templates/config.toml`.

Wrapper routing adds mode-specific overrides on top of those profiles:

- `plan` and `orchestrate` follow the selected `openagentsbtw` tier
- `implement` and `accept` force `gpt-5.2-codex` with `high`
- `review` forces `gpt-5.2` with `high`
- bounded utility modes stay on `openagentsbtw-codex-mini`

## Optional DeepWiki MCP

`./install.sh --codex --codex-deepwiki` appends a managed `mcp_servers.deepwiki` block to `~/.codex/config.toml`:

- endpoint: `https://mcp.deepwiki.com/mcp`
- enabled: `true`
- scope: user-level Codex config only

This is opt-in because it is only useful for the explicit `deepwiki` exploration route and only makes sense for GitHub repos that DeepWiki can index.

## Optional Chrome DevTools MCP

`./install.sh --codex --chrome-devtools-mcp` appends a managed `mcp_servers.chrome-devtools` block to `~/.codex/config.toml` (and `--no-chrome-devtools-mcp` removes only the managed block).

This enables the `chrome-devtools-mcp@latest` server, which lets agents use Chrome DevTools for debugging and performance traces.

## Optional Browser MCP

`./install.sh --codex --browsermcp` appends a managed `mcp_servers.browsermcp` block to `~/.codex/config.toml` (and `--no-browsermcp` removes only the managed block).

Browser MCP requires installing the Browser MCP Chrome extension and connecting a tab before tools can act on that page.

## Memory Layer

Codex already has native SQLite-backed state persistence and saved sessions. openagentsbtw does not replace that. The Codex package layers a second, plugin-owned SQLite DB on top for project recall:

- native Codex SQLite keeps Codex runtime/session state
- `~/.codex/openagentsbtw/state/memory.sqlite` stores openagentsbtw per-project memory

That overlay is driven by the existing SessionStart, UserPromptSubmit, and Stop hooks:

- SessionStart loads the current project's recap plus recent session notes
- UserPromptSubmit adds a lightweight project-memory hint during active work
- Stop persists a bounded deterministic session summary for later recall

The overlay assumes native persistence is still enabled. If a user disables SQLite or sets history persistence to `none`, the startup hook warns that cross-session recall will be weakened.

## Attribution And Style

Codex exposes native `commit_attribution` in `config.toml` as a top-level key (not per-profile). openagentsbtw sets it once in the managed block so it applies across the installed profiles. Set an empty string to disable attribution.

We also set `personality = "none"` in the managed Codex profiles. The response style is intentionally driven by `AGENTS.md`, the custom agent TOMLs, and wrapper prompts so the Codex output stays close to the old CCA contract instead of mixing in a separate personality overlay.

## Plan Mode Limit

`plan_mode_reasoning_effort` only changes reasoning depth inside native plan mode. It does not bind `/plan` to a specific custom agent or model family. openagentsbtw therefore uses wrapper commands plus custom agent TOMLs for role-shaped routing, and documents native `/plan` as reasoning mode rather than role selection.

## Safety Model Vs Claude

Codex can enforce similar safety outcomes to Claude Code, but not through the same `allow` / `ask` / `deny` permission matrix shape. The Codex-native enforcement model is:

- `sandbox_mode`
- `approval_policy`
- writable roots
- rules
- project trust
- hooks

That means Codex is good at sandbox boundaries and approval boundaries, but it is not a one-for-one port of Claude’s per-tool permission patterns.

## Fast Mode

OpenAI documents Fast mode and the `service_tier` controls separately. openagentsbtw disables Fast mode in the profile because the system depends on deeper planning, stronger review, and predictable hook execution rather than lowest-latency behavior. Sources: <https://developers.openai.com/codex/speed>, <https://developers.openai.com/codex/config-reference>

## AGENTS Fallbacks

Codex supports project doc fallback filenames. We intentionally keep openagentsbtw centered on real `AGENTS.md` files rather than fallback-only behavior, because the Codex docs make `AGENTS.md` the primary project-instruction surface. Source: <https://developers.openai.com/codex/guides/agents-md>

## Install Behavior

The installer appends a managed profile block instead of attempting a full TOML rewrite. If the user already has a default `profile = ...` set, the installer preserves it and leaves profile selection to the user. If no default profile exists, the installer points `profile = ...` at the selected preset, with `openagentsbtw-plus` now the default install choice and `openagentsbtw-pro` remaining explicit opt-in.
