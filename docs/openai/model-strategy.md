# Codex Model Strategy

As of March 27, 2026, there are two relevant sources for the Codex model strategy:

- official OpenAI model docs, which describe the broader OpenAI model lineup
- local Codex CLI `/model` output, which is the source of truth for what the installed Codex client actually exposes

On this machine, the local Codex CLI exposes:

- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex`
- `gpt-5.3-codex-spark`
- `gpt-5.2-codex`
- `gpt-5.2`
- `gpt-5.1-codex-max`
- `gpt-5.1-codex-mini`

That local list is an observation from the Codex CLI, not an official OpenAI docs page. It is the reason openagentsbtw uses `gpt-5.1-codex-mini` rather than the API-side `nano` concept in the Codex-specific config.

The broader official OpenAI model docs still support the higher-level split we need:

- `gpt-5.4`
  1,050,000 context window and reasoning effort from `none` through `xhigh`. Source: <https://developers.openai.com/api/docs/models/gpt-5.4>
- `gpt-5.3-codex`
  Codex-specialized coding model used as the normal 200K/400K-class coding default in this port. Source: <https://developers.openai.com/api/docs/models/gpt-5.3-codex>
- `gpt-5.4-mini`
  Lighter GPT-5.4-class model appropriate for cheaper secondary roles. Source: <https://developers.openai.com/api/docs/models/gpt-5.4-mini>
- `gpt-5.1-codex-mini`
  Available in the local Codex CLI as the cheaper, faster, less capable Codex-optimized small model.

## Presets

openagentsbtw uses two install presets plus one optional lightweight profile:

- `plus`
  Intended for users who want the Codex-specialized model as the main workhorse.
- `pro`
  Intended for users who want the 1M-context flagship model for orchestration and planning.
- `codex-mini`
  Installed as an extra manual profile for narrow extraction, ranking, classification, or other high-volume side work.

These are openagentsbtw presets, not official OpenAI entitlement checks. The installer does not attempt to verify a user’s OpenAI plan.

## Agent Mapping

### `plus`

- `odysseus`: `gpt-5.3-codex` with `high`
- `athena`: `gpt-5.3-codex` with `high`
- `hephaestus`: `gpt-5.3-codex` with `high`
- `nemesis`: `gpt-5.3-codex` with `high`
- `hermes`: `gpt-5.4-mini` with `medium`
- `atalanta`: `gpt-5.4-mini` with `medium`
- `calliope`: `gpt-5.4-mini` with `medium`

### `pro`

- `odysseus`: `gpt-5.4` with `high`
- `athena`: `gpt-5.4` with `high`
- `hephaestus`: `gpt-5.3-codex` with `high`
- `nemesis`: `gpt-5.3-codex` with `high`
- `hermes`: `gpt-5.3-codex` with `medium`
- `atalanta`: `gpt-5.4-mini` with `medium`
- `calliope`: `gpt-5.4-mini` with `medium`

## Why Codex Mini Is Separate

The local Codex CLI positions `gpt-5.1-codex-mini` as the cheaper and faster Codex-optimized small model. That is useful, but none of the existing seven openagentsbtw roles are consistently narrow enough to pin to it by default without degrading planning, review, or implementation quality. So openagentsbtw installs Codex Mini as an extra profile rather than assigning it to one of the main seven roles by default.

## Reasoning Defaults

openagentsbtw now treats `high` as the default ceiling for planning and orchestration. We do not use `xhigh` by default anymore.

Reasoning policy:

- planning/orchestration: `high`
- implementation/review: `high`
- exploration/docs/tests: `medium`
- lightweight manual profile: `low`

Rationale:

- user reports consistently describe `high` as more stable across long sessions
- `xhigh` can still be useful for rare hard problems, but it increases the risk of context churn, overreach, and unwanted autonomy
- if a user wants `xhigh`, it should be an explicit escalation, not the default

## Prompting Implication

The official GPT-5.4 prompt-guidance doc is relevant here because smaller models need clearer, more explicit structure than the flagship model. That matters most for the `mini` and `codex-mini` paths in this system. Source: <https://developers.openai.com/api/docs/guides/prompt-guidance>
