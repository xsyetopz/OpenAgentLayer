# Codex config export

openagentsbtw now renders Codex config from one canonical source:

- checked-in sample: `codex/templates/config.toml`
- installer-managed merge block in `~/.codex/config.toml`

Sample config adds schema header plus commented advanced examples. Managed merge blocks omit those sample-only extras.

Official reference: https://developers.openai.com/codex/config-reference

## Exported top-level keys

| Key                              | `plus`               | `pro-5`     | `pro-20`    | Why                                                            |
| -------------------------------- | -------------------- | ----------- | ----------- | -------------------------------------------------------------- |
| `profile`                        | sample only          | sample only | sample only | Make the checked-in sample boot straight into `openagentsbtw`. |
| `sqlite_home`                    | same                 | same        | same        | Keep openagentsbtw SQLite state isolated.                      |
| `project_doc_max_bytes`          | `12000`              | `16000`     | `24000`     | Tier-shaped `AGENTS.md` budget.                                |
| `hide_agent_reasoning`           | `true`               | same        | same        | Keep reasoning events hidden.                                  |
| `model_reasoning_summary`        | `"none"`             | same        | same        | Avoid summary overhead.                                        |
| `tool_output_token_limit`        | `800`                | `2000`      | `4000`      | Tier-shaped evidence budget for tool output.                   |
| `model_instructions_file`        | `~/.codex/AGENTS.md` | same        | same        | Keep guidance on the Codex-native instructions surface.        |
| `review_model`                   | `gpt-5.3-codex`      | same        | same        | Align built-in `/review` with the managed review split.        |
| `approvals_reviewer`             | `"auto_review"`      | same        | same        | Let the reviewer subagent handle eligible approval prompts.    |
| `allow_login_shell`              | `true`               | same        | same        | Preserve current shell/login semantics.                        |
| `web_search`                     | `"cached"`           | same        | same        | Safe global default for docs/search.                           |
| `project_doc_fallback_filenames` | `["CLAUDE.md"]`      | same        | same        | Still find repo guidance outside migrated `AGENTS.md` repos.   |

## Exported shared sections

- `[tools]`
  - `view_image = true`
- `[features]`
  - `codex_hooks = true`
  - `multi_agent = true`
  - `collaboration_modes = true`
  - `default_mode_request_user_input = true`
  - `fast_mode = false`
  - `memories = true`
  - `shell_tool = true`
  - `shell_snapshot = true`
  - `skill_mcp_dependency_install = true`
  - `unified_exec = true`
- `[history]`
  - `persistence = "save-all"`
  - `max_bytes = 134217728`
- `[memories]`
  - `generate_memories = true`
  - `use_memories = true`
  - `disable_on_external_context = true`
  - `min_rollout_idle_hours = 12`
- `compact_prompt`
  - Managed continuation prompt for terse, evidence-first compaction.

## Agent metadata export

Managed config now emits `[agents.<name>]` for all shipped Codex roles:

- `description`
- `config_file = "agents/<name>.toml"`
- `nickname_candidates = [...]`

The metadata comes from the same canonical `source/agents/*/agent.json` records that generate the shipped Codex agent TOMLs.

Swarm defaults are tier-shaped:

| Plan     | `agents.max_threads` | `agents.max_depth` | `agents.job_max_runtime_seconds` |
| -------- | -------------------- | ------------------ | -------------------------------- |
| `plus`   | `4`                  | `1`                | `1800`                           |
| `pro-5`  | `5`                  | `2`                | `2700`                           |
| `pro-20` | `6`                  | `2`                | `3600`                           |

## Exported profiles

### `openagentsbtw`
- `model = "gpt-5.5"`
- `model_reasoning_effort = "medium"`
- `plan_mode_reasoning_effort = "high"`

### `openagentsbtw-implement`
- `model = "gpt-5.3-codex"`
- `model_reasoning_effort = "medium"`
- `plan_mode_reasoning_effort = "medium"`

### `openagentsbtw-review`
- `model = "gpt-5.3-codex"`
- `model_reasoning_effort = "high"`
- `plan_mode_reasoning_effort = "high"`

### `openagentsbtw-utility`
- `model = "gpt-5.4-mini"`
- `model_reasoning_effort = "high"`
- `plan_mode_reasoning_effort = "high"`
- `web_search = "live"`

### `openagentsbtw-approval-auto`
- same model split as implementation
- `approval_policy = "on-request"`
- `approvals_reviewer = "auto_review"`

### `openagentsbtw-runtime-long`
- same model split as implementation
- `background_terminal_max_timeout = 7200`
- `prevent_idle_sleep = true`

## Sample-only extras

`codex/templates/config.toml` also includes:

- schema header:
  - `#:schema https://developers.openai.com/codex/config-schema.json`
- commented DeepWiki example
- commented advanced examples for:
  - named permissions profiles
  - granular approval policy
  - app defaults
  - object-form web search tool config

Installer-managed config does **not** merge those sample-only commented examples into the user’s live `~/.codex/config.toml`.

## Notes

- openagentsbtw does not hard-code `service_tier = "flex"` in managed Codex config.
- `xhigh` remains manual-only; managed defaults stay `high` for Plan mode and review, `medium` for top-level edit/implementation, and `high` for bounded utility.
- `plus|pro-5|pro-20` rewrite the contents of `openagentsbtw*` profiles. They do not create plan-specific profile names.
- Native Codex config has no confirmed documented key for defaulting raw TUI startup into Plan mode; wrapper no-mode prompts route to `plan`.
