# Model routing

Purpose: model/profile/subscription routing spec.

Authority: normative.

## Concepts

- Model ID: concrete model string.
- Model intent: role-level desired capability.
- Profile: surface-native execution profile.
- Plan: bundle of model assignments and concurrency limits.
- Speed mode: route modifier that changes latency/cost behavior.
- Slow mode: route modifier that increases deliberation budget for hard planning/review tasks.

## Role defaults

- Planner role gets strongest reasoning.
- Implementer role gets coding-optimized model.
- Reviewer role gets high reasoning.
- Research role gets efficient high-context model.
- Validation role gets efficient model plus execution permissions.
- Documentation role gets efficient model with strict source-evidence requirements.

## Plan presets

OAL defines these model-routing plans:

- `codex-plus`
- `codex-pro-5`
- `codex-pro-20`
- `claude-max-5`
- `claude-max-20`

Plan records must define:

- global default model;
- global implementation effort;
- plan-mode effort;
- review effort;
- role assignments;
- effort ceiling;
- whether plan is default for each listed surface;
- explicit deep-route overrides;
- long-context route allowances.

Every model plan must assign every source agent role. Missing role assignments are validation failures because subagent routing must stay explicit, subscription-aware, and free from hardcoded role assumptions.

Adapters must not synthesize model assignments from role `model_class`,
role `effort_ceiling`, provider defaults, or profile defaults when a selected
model plan is missing an assignment. A missing model plan or missing role
assignment is a diagnostic. Rendered agent and command model fields are valid
only when they come from:

- the selected surface model plan role assignment;
- an explicit command `model_policy`;
- a surface-native profile generated from a source model-plan record.

## Codex plan rules

All OAL-generated Codex profiles must set:

```toml
[features]
fast_mode = false
multi_agent = false
multi_agent_v2 = true
unified_exec = false
```

Codex model set:

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex`
- `gpt-5.2`

Codex effort levels:

- `none`
- `low`
- `medium`
- `high`
- `xhigh`

`xhigh` is never a default. It is allowed only on explicit deep routes.

## Claude plan rules

OAL-generated Claude presets target Max subscription tiers:

- `claude-max-5`
- `claude-max-20`

Claude model aliases:

- `haiku`
- `sonnet`
- `opus`
- `opusplan`
- `sonnet[1m]`
- `opus[1m]`

Current Anthropic API alias behavior for OAL docs:

- `opus` resolves to Opus 4.7.
- `sonnet` resolves to Sonnet 4.6.
- `opusplan` uses `opus` in plan mode and `sonnet` in execution mode.
- `haiku` is for simple tasks and background work.

Full model IDs are required when exact selection matters:

- use `claude-opus-4-7` for exact Opus 4.7;
- use `claude-sonnet-4-6` for exact Sonnet 4.6;
- use `claude-opus-4-6` for exact Opus 4.6;
- use `[1m]` suffix only for explicit long-context routes, for example `claude-opus-4-6[1m]`.

Claude effort rules:

- no `max` default;
- no `xhigh` default;
- `xhigh` only for explicit Opus 4.7 deep routes;
- `max` manual-only;
- 1M context variants are route modifiers, not defaults.

## Expanded Greek role taxonomy

Agent roles are source data. The implementation must not hardcode the v3 seven-role set.

Agent records must support:

- `family`
- `mode`
- `primary`
- `subagent`
- `route_kind`
- `model_class`
- `effort_ceiling`
- `budget_tier`
- `handoff_contract`

Current role families:

- Strategy
- Execution
- Review and risk
- Validation
- Documentation and memory
- Coordination
- UX and design
- Security and policy

Current seed roles:

- Athena
- Metis
- Themis
- Hephaestus
- Ares
- Hermes
- Nemesis
- Dike
- Hecate
- Atalanta
- Apollo
- Asclepius
- Calliope
- Mnemosyne
- Clio
- Odysseus
- Iris
- Aphrodite
- Daedalus
- Hestia
- Argus

## Cost-balance rules

- Use small/efficient models for bounded subagents.
- Use coding-optimized models for implementation and code review.
- Use strongest models for strategy, orchestration, and high-risk review.
- Keep expensive models out of broad fan-out unless plan tier explicitly allows them.
- Do not let subagents inherit parent model automatically.
- Every role assignment must define an effort ceiling.

## Validation

- Unknown model IDs fail source validation.
- Unknown plan names fail source validation.
- Missing role assignments fail source validation.
- Surface adapter must report unsupported model settings.
- Model routing must be test-covered.
- Role assignments must validate against known model set per surface.
- Role records must validate handoff contract presence.
- Surface adapters must not emit hardcoded fallback profiles or default role
  models when model-plan source data is incomplete.
- OpenCode `default_agent` must resolve from exactly one OpenCode-capable
  source agent with `primary = true`; zero or multiple candidates are
  diagnostics.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
- [Codex model balance study](../docs/model-routing/codex-model-balance-study.md)
- [Claude Code model balance study](../docs/model-routing/claude-code-model-balance-study.md)
- [Expanded Greek agent taxonomy](../docs/model-routing/expanded-greek-agent-taxonomy.md)
- [Agent role assignment study](../docs/model-routing/agent-role-assignment-study.md)
