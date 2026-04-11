# Codex Config Notes

Codex supports both global and project config files. The basic flow is `~/.codex/config.toml` for user defaults plus `.codex/config.toml` for repo-specific overrides, with CLI flags able to override config at runtime. Sources: <https://developers.openai.com/codex/config-basic>, <https://developers.openai.com/codex/config-reference>, <https://developers.openai.com/codex/config-sample>

## openagentsbtw Profiles

openagentsbtw installs a plan-aware `openagentsbtw` main profile, a matching `openagentsbtw-<plan>` alias, plus `openagentsbtw-codex-mini`, `openagentsbtw-accept-edits`, and `openagentsbtw-longrun` into `~/.codex/config.toml` rather than overwriting arbitrary top-level user settings.

The installer also enables the plugin in Codex config by adding (or preserving) a plugin entry:

```toml
[plugins."openagentsbtw@openagentsbtw-local"]
enabled = true
```

- `openagentsbtw-go`, `openagentsbtw-plus`, `openagentsbtw-pro-5`, `openagentsbtw-pro-20`
  Plan aliases for the selected ChatGPT/Codex capability preset.
- `openagentsbtw-codex-mini`
  Uses `gpt-5.3-codex-spark` on the Pro plans and `gpt-5.4-mini` on `go` / `plus`.
- `openagentsbtw`
  Stays stable as the wrapper target, but its model now comes from the selected plan.
- `openagentsbtw-implement`
  Stable implementation profile used by wrapper routes across plans.
- `openagentsbtw-accept-edits`
  Uses the selected plan’s implementation route for sandboxed auto-accept work.
- `openagentsbtw-longrun`
  Uses the selected plan’s implementation route for patient long-running builds and test suites with `unified_exec`, idle-sleep prevention, and a higher background terminal timeout.

The managed profiles share the same model/style defaults unless noted otherwise:

- `plan_mode_reasoning_effort = "high"` except the codex-mini profile, which stays low
- `model_verbosity = "low"` across every managed profile
- top-level `model_reasoning_summary = "none"` in the managed Codex block
- `personality = "none"`
- `sandbox_mode = "workspace-write"` across every managed profile
- `codex_hooks = true`
- `sqlite = true`
- `multi_agent = true`
- `fast_mode = false`

Approval policy splits by mode:

- the main plan alias, `openagentsbtw-codex-mini`, and `openagentsbtw` use `approval_policy = "on-request"`
- `openagentsbtw-accept-edits` uses `approval_policy = "never"`

The matching repo sample is in `codex/templates/config.toml`.

Wrapper routing adds mode-specific overrides on top of those profiles:

- `plan`, `review`, and `orchestrate` use the stable `openagentsbtw` profile for the selected plan
- `implement` uses the stable `openagentsbtw-implement` profile
- `accept` uses the stable `openagentsbtw-accept-edits` profile
- `qa` stays on the codex-mini route for bounded evidence gathering and repro
- `longrun` uses the dedicated `openagentsbtw-longrun` profile
- bounded utility modes stay on `openagentsbtw-codex-mini`, with Spark reserved for Pro plans only

## Optional DeepWiki MCP

`./install.sh --deepwiki-mcp` enables managed DeepWiki config on every installed surface that supports it:

- Codex: `~/.codex/config.toml`
- Claude: `~/.claude/settings.json`
- OpenCode: `opencode.json[c]` in the active scope
- Copilot: `.vscode/mcp.json` for project installs and VS Code user MCP config when the global install is present

This is opt-in because it is only useful for the explicit `deepwiki` exploration route and only makes sense for GitHub repos that DeepWiki can index.

After install, `./config.sh --deepwiki` and `./config.sh --no-deepwiki` provide the same toggle without a full reinstall.

## Optional Context7 CLI

openagentsbtw supports Context7 as a CLI-only tool path:

```bash
./install.sh --ctx7-cli
```

- The installer writes a managed `ctx7` wrapper to `~/.local/bin/ctx7`.
- If provided, `CONTEXT7_API_KEY` is stored in `~/.config/openagentsbtw/config.env`.
- Guidance across Codex/Claude/OpenCode/Copilot tells agents to use `ctx7` automatically for external library/API/setup/config docs work when available.
- openagentsbtw does not install a managed Context7 MCP server block.

Post-install updates:

```bash
./config.sh --ctx7
./config.sh --no-ctx7
./config.sh --ctx7-api-key
```

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

OpenAI documents Fast mode and `service_tier` controls separately. openagentsbtw disables Fast mode in managed profiles because the system depends on deeper planning, stronger review, and predictable hook execution rather than lowest-latency behavior. The managed profiles leave `service_tier` unset by default to preserve account compatibility, and reserve `service_tier = "fast"` for the explicit fast wrapper routes. Sources: <https://developers.openai.com/codex/speed>, <https://developers.openai.com/codex/config-reference>

## Long-Run Profile

For long-running builds and test suites, openagentsbtw adds a dedicated `openagentsbtw-longrun` profile instead of relying only on generic prompt discipline:

- `features.unified_exec = true`
- `features.prevent_idle_sleep = true`
- `background_terminal_max_timeout = 7200`

This does not change Codex’s internal polling behavior. The contract is narrower: use the longrun route when the job is legitimately long, and tell the model not to kill a healthy process without concrete failure evidence.

## AGENTS Fallbacks

Codex supports project doc fallback filenames. We intentionally keep openagentsbtw centered on real `AGENTS.md` files rather than fallback-only behavior, because the Codex docs make `AGENTS.md` the primary project-instruction surface. Source: <https://developers.openai.com/codex/guides/agents-md>

## Install Behavior

The installer appends a managed profile block instead of attempting a full TOML rewrite. During interactive Codex install, it asks whether to set a top-level `profile = ...` default in `~/.codex/config.toml` (to the selected preset). If declined, existing/default profile behavior is preserved and users can still choose with `--profile`. For automation, `--codex-set-top-profile` and `--no-codex-set-top-profile` force that behavior without prompts. In CI/non-interactive runs, when neither flag is provided, it defaults the selected preset to `pro-5` and sets `profile = ...` only when none exists.
