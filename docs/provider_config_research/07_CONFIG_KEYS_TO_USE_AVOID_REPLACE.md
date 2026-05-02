# Config Keys to Use, Avoid, and Replace

## Codex

Use:

- `model`
- `model_provider` when intentionally controlling provider.
- `model_reasoning_effort` -- at top-level, is used for "Plan mode"
- `plan_mode_reasoning_effort` -- at top-level, is used for "edit/implement mode"
- `model_reasoning_summary`
- `model_verbosity`
- `approval_policy`
- `approvals_reviewer = "auto_review"`
- `sandbox_mode`
- `service_tier`
- `model_instructions_file`
- `[agents]` with `max_threads`, `max_depth`, `job_max_runtime_seconds`, `interrupt_message`.
- `[agents.<role>]` with `description`, `nickname_candidates`, `config_file`.
- `features.codex_hooks`, `hooks`, `plugin_hooks`, `multi_agent`, `multi_agent_v2`, `child_agents_md`, `sqlite`, `memories`, `memory_tool`, `shell_tool`, `shell_snapshot`, `unified_exec`, `web_search`, `search_tool`, `plugins`, `goals`, `prevent_idle_sleep` as appropriate.

Avoid/replace:

- `approval_policy = "on-failure"` → use `on-request` or `never`.
- `approvals_reviewer = "deprecated approval alias"` → use `auto_review`.
- deprecated no-op ghost snapshot fields.
- prompt/agent hooks if the installed Codex version still skips them.
- blocked Codex models, blocked model names.

## Claude Code

Use:

- `settings.json` hierarchy.
- `permissions` allow/deny/ask/default behavior.
- `hooks` with executable `.mjs` commands.
- `model`, `availableModels`, `modelOverrides` when project-safe.
- `effortLevel` where supported.
- `enabledPlugins` only when plugin payload exists.
- `env` for OAL runtime env variables.
- `statusLine` if useful and non-invasive.
- subagents and skills directories.

Avoid/replace:

- stale blocked Claude model family models.
- deprecated `includeCoAuthoredBy` if current attribution object is available.
- writing `.claude/settings.local.json` without explicit user/local install choice.
- toggling plugins without installed plugin payload.

## OpenCode

Use:

- `$schema`
- `provider`
- `model`
- `small_model`
- `agent`
- `default_agent`
- `command`
- `permission`
- `plugin`
- `mcp`
- `instructions`
- `compaction`
- `formatter`
- `snapshot`
- `watcher`

Avoid/replace:

- deprecated `tools` boolean control → use `permission`.
- TUI settings in `opencode.json` when docs point to `tui.json`.
- fake tool entries with no `.opencode/tools/*.ts` file.
- defaulting to a subagent in `default_agent`; use a primary agent.

## Cross-provider replacement principle

Never keep deprecated/deprecated fields because baseline behavior used them. Render current provider-supported keys and keep migration cleanup separate from new OAL product output.
