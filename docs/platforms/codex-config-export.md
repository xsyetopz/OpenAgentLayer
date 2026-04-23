# Codex config export

openagentsbtw exports a managed subset of Codex `config.toml` keys. This is not a full mirror of upstream Codex config; it is the repo-owned profile and safety layer.

Official reference: https://developers.openai.com/codex/config-reference

## Exported top-level keys

| Key                       |                          `plus` | `pro-5` | `pro-20` | Why                                                                           |
| ------------------------- | ------------------------------: | ------: | -------: | ----------------------------------------------------------------------------- |
| `sqlite_home`             | `~/.codex/openagentsbtw/sqlite` |    same |     same | Keep managed Codex state isolated.                                            |
| `project_doc_max_bytes`   |                         `12000` | `16000` |  `24000` | Reddit tweak adapted by tier; higher tiers keep more `AGENTS.md` context.     |
| `hide_agent_reasoning`    |                          `true` |    same |     same | Keep raw reasoning hidden.                                                    |
| `model_reasoning_summary` |                        `"none"` |    same |     same | Avoid summary overhead.                                                       |
| `tool_output_token_limit` |                          `1200` |  `4000` |   `8000` | Reddit tweak adapted by tier; higher tiers preserve more validation evidence. |
| `model_instructions_file` |            `~/.codex/AGENTS.md` |    same |     same | Route managed global guidance through Codex-native config.                    |

## Exported shared sections

- `[history]`
  - `persistence = "save-all"`
  - `max_bytes = 134217728`
- `[memories]`
  - `generate_memories = true`
  - `use_memories = true`
  - `no_memories_if_mcp_or_web_search = true`
  - `min_rollout_idle_hours = 12`
- `compact_prompt`
  - Managed continuation prompt for terse, evidence-first compaction.
- `agents.max_threads`
  - Tier-shaped swarm cap.
- `agents.max_depth = 1`

## Exported profiles

### `openagentsbtw`
- `model = "gpt-5.4"`
- `model_reasoning_effort = "high"`
- `plan_mode_reasoning_effort = "high"`
- `model_verbosity = "low"`
- `personality = "pragmatic"`

### `openagentsbtw-implement`
- `model = "gpt-5.3-codex"`
- `model_reasoning_effort = "medium"`
- `plan_mode_reasoning_effort = "medium"`
- `model_verbosity = "low"`
- `personality = "pragmatic"`

### `openagentsbtw-utility`
- `model = "gpt-5.4-mini"`
- `model_reasoning_effort = "high"`
- `plan_mode_reasoning_effort = "high"`
- `model_verbosity = "low"`
- `personality = "pragmatic"`

### `openagentsbtw-approval-auto`
- Same model and reasoning split as `openagentsbtw-implement`
- `approval_policy = "never"`

### `openagentsbtw-runtime-long`
- Same model and reasoning split as `openagentsbtw-implement`
- `background_terminal_max_timeout = 7200`
- `features.unified_exec = true`
- `features.prevent_idle_sleep = true`

## Notes

- openagentsbtw does not hard-code `service_tier = "flex"` in managed Codex config.
- `xhigh` remains available manually, but the managed defaults follow the Reddit-derived split: high for plan/review/orchestration, medium for implementation, high for bounded utility work.
- `fast_mode = false` stays default in managed profiles; wrapper flags can still opt into fast mode.
