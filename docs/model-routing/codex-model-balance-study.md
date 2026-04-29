# Codex model balance study

Purpose: define OAL Codex plan presets, model allocation, and effort ceilings for cost-aware agent routing.

Authority: study input for `../../specs/model-routing.md`.

Sources:

- `https://developers.openai.com/api/docs/models`
- `https://developers.openai.com/api/docs/models/gpt-5.4`
- `https://developers.openai.com/api/docs/models/gpt-5.4-mini`
- `https://developers.openai.com/api/docs/models/gpt-5.3-codex`
- `https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/config.schema.json`

Retrieval date: 2026-04-29.

## OAL Codex model set

| Model | OAL use | Effort support | Routing note |
| --- | --- | --- | --- |
| `gpt-5.5` | scarce frontier planner/orchestrator | `none`, `low`, `medium`, `high`, `xhigh` | Use for Athena/Metis/Themis/Odysseus on Pro 5x/20x only. |
| `gpt-5.4` | strong general agentic work | `none`, `low`, `medium`, `high`, `xhigh` | Default strong model for Plus planning and Pro broad work. |
| `gpt-5.4-mini` | efficient subagents and bounded tasks | `none`, `low`, `medium`, `high`, `xhigh` | Default for Hermes, Calliope, Atalanta, Iris, Clio, Mnemosyne helpers. |
| `gpt-5.3-codex` | agentic coding implementation/review | `low`, `medium`, `high`, `xhigh` | Default for Hephaestus, Ares, Nemesis, Dike on Pro plans. |

## Required Codex TOML feature defaults

Every OAL-generated Codex profile must set:

```toml
[features]
fast_mode = false
multi_agent_v2 = true
unified_exec = false
```

Reason:

- `fast_mode = false`: conserve weekly usage; fast mode is opt-in route behavior, not baseline.
- `multi_agent_v2 = true`: required for OAL role/subagent routing.
- `unified_exec = false`: OAL keeps known command/hook behavior until a separate study proves unified exec semantics.

## Effort policy

Allowed effort values:

- `none`
- `low`
- `medium`
- `high`
- `xhigh`

OAL defaults:

- Utility/helper agents: `low` or `medium`.
- Research/docs/validation agents: `medium`.
- Planning/review agents: `high`.
- Implementation agents: `medium` or `high`.
- `xhigh`: explicit deep route only; never default.

## Plan: `codex-plus`

Purpose: ChatGPT Plus preset. Optimize for useful routing without draining usage.

Global defaults:

- default model: `gpt-5.4-mini` or `gpt-5.4` depending route;
- edit/implementation effort: `low` or `medium`;
- plan effort: `medium`;
- review effort: `medium`;
- `xhigh`: disabled.

Role defaults:

| Role family | Default model | Effort |
| --- | --- | --- |
| Strategy | `gpt-5.4` | `medium` |
| Execution | `gpt-5.3-codex` | `medium` |
| Review/risk | `gpt-5.3-codex` | `medium` |
| Validation | `gpt-5.4-mini` | `medium` |
| Documentation/memory | `gpt-5.4-mini` | `medium` |
| Coordination | `gpt-5.4` | `medium` |
| UX/design | `gpt-5.4-mini` | `medium` |
| Security/policy | `gpt-5.3-codex` | `medium` |

Do not default to `gpt-5.5` on Plus.

## Plan: `codex-pro-5`

Purpose: balanced Pro preset. Strong enough for multi-agent work, still usage-aware.

Global defaults:

- default model: `gpt-5.4`;
- edit/implementation effort: `medium`;
- plan effort: `high`;
- review effort: `high`;
- `xhigh`: allowed only on explicit deep route for Athena, Metis, Themis, Nemesis, or Dike.

Role defaults:

| Role family | Default model | Effort |
| --- | --- | --- |
| Strategy | `gpt-5.5` for selected routes, otherwise `gpt-5.4` | `high` |
| Execution | `gpt-5.3-codex` | `medium` |
| Review/risk | `gpt-5.3-codex` | `high` |
| Validation | `gpt-5.4-mini` | `medium` |
| Documentation/memory | `gpt-5.4-mini` | `medium` |
| Coordination | `gpt-5.5` for Odysseus, otherwise `gpt-5.4` | `high` |
| UX/design | `gpt-5.4` or `gpt-5.4-mini` | `medium` |
| Security/policy | `gpt-5.3-codex` | `high` |

## Plan: `codex-pro-20`

Purpose: aggressive Pro preset. Uses strong models more often but still avoids waste.

Global defaults:

- default model: `gpt-5.4`;
- edit/implementation effort: `medium`;
- plan effort: `high`;
- review effort: `high`;
- `xhigh`: explicit deep route only.

Role defaults:

| Role family | Default model | Effort |
| --- | --- | --- |
| Strategy | `gpt-5.5` | `high`, `xhigh` only explicit |
| Execution | `gpt-5.3-codex` | `medium` or `high` |
| Review/risk | `gpt-5.3-codex` | `high`, `xhigh` only explicit |
| Validation | `gpt-5.4-mini` | `medium` or `high` |
| Documentation/memory | `gpt-5.4-mini` | `medium` |
| Coordination | `gpt-5.5` | `high` |
| UX/design | `gpt-5.4` | `high` for visual architecture, `medium` otherwise |
| Security/policy | `gpt-5.3-codex` | `high` |

## Usage-budget rules

- Prefer `gpt-5.4-mini` for bounded classification, summarization, doc cleanup, status extraction, and narrow tracing.
- Prefer `gpt-5.3-codex` for code edits and code review.
- Prefer `gpt-5.4` for general planning when `gpt-5.5` is not worth the budget.
- Prefer `gpt-5.5` for architecture, contradiction resolution, orchestration planning, and high-risk reviews.
- Do not let every subagent inherit the parent model.
- Do not use `xhigh` for routine route wrappers.

## OAL implementation notes

- Generate separate profiles per plan and route class.
- Keep `model_reasoning_effort` and `plan_mode_reasoning_effort` independent.
- On Plus, use `plan_mode_reasoning_effort = "medium"` and implementation `model_reasoning_effort = "low"` or `"medium"`.
- On Pro 5x/20x, use `plan_mode_reasoning_effort = "high"` and implementation `model_reasoning_effort = "medium"`.
- Deep explicit route may override effort to `xhigh` only for selected roles.

