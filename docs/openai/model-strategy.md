# Codex Model Strategy

As of April 4, 2026, there are two relevant sources for Codex model policy:

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

That local list is an observation from the Codex CLI, not an official OpenAI docs page.

The broader official OpenAI model docs still support the split we need:

- `gpt-5.2`
  General GPT-5 model used here for high-reasoning main work. Source: <https://developers.openai.com/api/docs/models/gpt-5.2>
- `gpt-5.3-codex`
  Codex-specialized GPT-5 model used here for implementation-heavy coding and code-specialized daily work. Source: <https://developers.openai.com/api/docs/models/gpt-5.3-codex>
- `gpt-5.3-codex-spark`
  Faster lightweight Codex-specialized variant used here for the managed mini profile. Source: <https://developers.openai.com/api/docs/models/gpt-5.3-codex-spark>

## Policy

openagentsbtw now uses a three-way Codex split:

- `gpt-5.2` for high-reasoning main work
- `gpt-5.3-codex` for implementation-heavy coding
- `gpt-5.3-codex-spark` for the lightweight mini profile

The reasons for the policy are operational:

- `gpt-5.2` is the preferred high-reasoning route
- `gpt-5.3-codex` stays pinned for implementation and code-specialized execution
- `gpt-5.3-codex-spark` gives the mini profile an actually smaller Codex-specialized model
- full `gpt-5.4` is not used in managed routing

## Presets

openagentsbtw uses two install presets plus one optional lightweight profile:

- `plus`
  Code-specialized preset. Uses `gpt-5.3-codex` for the main interactive session.
- `pro`
  Default high-reasoning preset. Uses `gpt-5.2` for the main interactive session.
- `codex-mini`
  Lightweight profile for narrow extraction, ranking, classification, and other bounded high-volume work on `gpt-5.3-codex-spark`.

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

- `athena`: `gpt-5.2` with `high`
- `hephaestus`: `gpt-5.3-codex` with `high`
- `nemesis`: `gpt-5.2` with `high`
- `odysseus`: `gpt-5.2` with `high`
- `hermes`: `gpt-5.3-codex` with `medium`
- `atalanta`: `gpt-5.3-codex` with `medium`
- `calliope`: `gpt-5.3-codex` with `medium`

## Wrapper Routing

Wrapper routing is stricter than the base profile mapping:

- `plan`, `review`, and `orchestrate` use the stable `openagentsbtw` profile, which is pinned to `gpt-5.2`
- `implement` and `accept` force `gpt-5.3-codex` with `high`
- `triage`, `deepwiki`, `docs`, `desloppify`, `handoff`, and `test` stay on `openagentsbtw-codex-mini` with `gpt-5.3-codex-spark`

That split is intentional. The wrapper contract keeps planning/review on the engineer route, implementation on the code-specialized route, and bounded utility work on the smaller Codex route.

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
