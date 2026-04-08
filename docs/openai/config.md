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
  Defaults to `gpt-5.3-codex` with high reasoning for the main interactive session.
- `openagentsbtw-pro`
  Defaults to `gpt-5.2` with high reasoning for the main interactive session.
- `openagentsbtw-codex-mini`
  Defaults to `gpt-5.3-codex-spark` with low reasoning for narrow high-volume work.
- `openagentsbtw`
  Stays pinned to `gpt-5.2` so wrappers and users can rely on one stable high-reasoning main profile name.
- `openagentsbtw-accept-edits`
  Uses `gpt-5.3-codex` with high reasoning for sandboxed auto-accept implementation work.

The managed profiles share the same model/style defaults unless noted otherwise:

- `plan_mode_reasoning_effort = "high"` except the codex-mini profile, which stays low
- `model_verbosity = "medium"` except the codex-mini profile, which stays low
- `personality = "none"`
- `sandbox_mode = "workspace-write"` across every managed profile
- `codex_hooks = true`
- `sqlite = true`
- `multi_agent = true`
- `fast_mode = false`

Approval policy splits by mode:

- `openagentsbtw-plus`, `openagentsbtw-pro`, `openagentsbtw-codex-mini`, and `openagentsbtw` use `approval_policy = "on-request"`
- `openagentsbtw-accept-edits` uses `approval_policy = "never"`

The matching repo sample is in `codex/templates/config.toml`.

Wrapper routing adds mode-specific overrides on top of those profiles:

- `plan`, `review`, and `orchestrate` use the stable `openagentsbtw` profile on `gpt-5.2`
- `implement` and `accept` force `gpt-5.3-codex` with `high`
- bounded utility modes stay on `openagentsbtw-codex-mini` with `gpt-5.3-codex-spark`

## Optional DeepWiki MCP

`./install.sh --codex --codex-deepwiki` appends a managed `mcp_servers.deepwiki` block to `~/.codex/config.toml`:

- endpoint: `https://mcp.deepwiki.com/mcp`
- enabled: `true`
- scope: user-level Codex config only

This is opt-in because it is only useful for the explicit `deepwiki` exploration route and only makes sense for GitHub repos that DeepWiki can index.

## Optional Playwright CLI

openagentsbtw can optionally install Playwright CLI globally:

```bash
./install.sh --playwright-cli
```

Playwright CLI supports installing “skills” into a repo so coding agents can use browser automation. See `playwright-cli install --skills` in the upstream docs.

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

OpenAI documents Fast mode and `service_tier` controls separately. openagentsbtw disables Fast mode in managed profiles because the system depends on deeper planning, stronger review, and predictable hook execution rather than lowest-latency behavior. Managed profiles intentionally do not hard-code `service_tier`, so Codex can use an account-supported default tier unless users override it themselves. Sources: <https://developers.openai.com/codex/speed>, <https://developers.openai.com/codex/config-reference>

## AGENTS Fallbacks

Codex supports project doc fallback filenames. We intentionally keep openagentsbtw centered on real `AGENTS.md` files rather than fallback-only behavior, because the Codex docs make `AGENTS.md` the primary project-instruction surface. Source: <https://developers.openai.com/codex/guides/agents-md>

## Install Behavior

The installer appends a managed profile block instead of attempting a full TOML rewrite. During interactive Codex install, it asks whether to set a top-level `profile = ...` default in `~/.codex/config.toml` (to the selected preset). If declined, existing/default profile behavior is preserved and users can still choose with `--profile`. For automation, `--codex-set-top-profile` and `--no-codex-set-top-profile` force that behavior without prompts. In CI/non-interactive runs, when neither flag is provided, it defaults the selected preset to `pro` and sets `profile = ...` only when none exists.
