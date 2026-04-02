# Codex Model Strategy

As of April 2, 2026, there are two relevant sources for Codex model policy:

- official OpenAI model docs, which describe the broader model lineup
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

That local list is an observation from the Codex CLI, not an official OpenAI docs page. openagentsbtw treats `openagentsbtw-codex-mini` as a lightweight *profile* (low reasoning/verbosity), not as a mandate to use a "mini" model.

The broader official OpenAI model docs still support the split we need:

- `gpt-5.4`
  Flagship GPT-5 model with the largest context budget. Source: <https://developers.openai.com/api/docs/models/gpt-5.4>
- `gpt-5.3-codex`
  Codex-specialized GPT-5 model used here as the stable daily driver for planning, review, and implementation. Source: <https://developers.openai.com/api/docs/models/gpt-5.3-codex>

## Policy

openagentsbtw is now `5.3-codex`-first for Codex. That is an openagentsbtw routing decision, not a claim that one OpenAI model is universally better for every task.

The reasons for the policy are operational:

- code-specialized default without forcing "mini" models into routine routes
- lower latency than the previous `5.4`-heavy path
- better instruction stability than `xhigh`-style flagship routing for routine work
- better fit for wrapper-based planning, review, and implementation splits

`gpt-5.4` remains available, but only in the explicit `pro` path where larger-context planning or orchestration is actually wanted.

## Presets

openagentsbtw uses two install presets plus one optional lightweight profile:

- `plus`
  Default preset. Uses `gpt-5.3-codex` for the main interactive session.
- `pro`
  Explicit opt-in preset. Uses `gpt-5.4` for the main interactive session.
- `codex-mini`
  Lightweight profile for narrow extraction, ranking, classification, and other bounded high-volume work (low reasoning/verbosity, not a "mini model" requirement).

These are openagentsbtw presets, not official OpenAI entitlement checks. The installer does not attempt to verify a user’s OpenAI plan.

## Agent Mapping

Custom agent TOMLs are installed from this repo, then the Codex installer applies a tier-specific model mapping during install. Current mappings:

### `plus`

- `athena`: `gpt-5.3-codex` with `high`
- `hephaestus`: `gpt-5.3-codex` with `high`
- `nemesis`: `gpt-5.3-codex` with `high`
- `odysseus`: `gpt-5.3-codex` with `high`
- `hermes`: `gpt-5.3-codex` with `medium`
- `atalanta`: `gpt-5.3-codex` with `medium`
- `calliope`: `gpt-5.3-codex` with `medium`

### `pro`

- `athena`: `gpt-5.4` with `high`
- `hephaestus`: `gpt-5.3-codex` with `high`
- `nemesis`: `gpt-5.4` with `high`
- `odysseus`: `gpt-5.4` with `high`
- `hermes`: `gpt-5.3-codex` with `medium`
- `atalanta`: `gpt-5.3-codex` with `medium`
- `calliope`: `gpt-5.4` with `medium`

## Wrapper Routing

Wrapper routing is stricter than the base profile mapping:

- `plan` and `orchestrate` follow the selected tier through `openagentsbtw`
- `implement` and `accept` force `gpt-5.3-codex` with `high`
- `review` follows the selected tier through `openagentsbtw`
- `triage`, `deepwiki`, `docs`, `desloppify`, `handoff`, and `test` stay on `openagentsbtw-codex-mini`

That split is intentional. The wrapper contract is where we enforce the fast daily-driver path without taking away the explicit `pro` option.

## Reasoning Defaults

openagentsbtw treats `high` as the default ceiling for important work. We do not use `xhigh` by default.

Reasoning policy:

- planning/orchestration: `high`
- implementation/review: `high`
- exploration/docs/tests: `medium`
- lightweight manual profile: `low`

Rationale:

- `high` is the stable default for long sessions
- `xhigh` remains a manual escalation for unusually hard problems
- defaulting to `xhigh` increases latency, context churn, and overreach risk for ordinary work
