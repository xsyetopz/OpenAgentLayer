# Codex Model Strategy

As of April 9, 2026, openagentsbtw treats ChatGPT/Codex plans as framework presets, not entitlement checks. The installer does not verify a user's OpenAI subscription.

## Models

| Model                 | Role                                            |
| --------------------- | ----------------------------------------------- |
| `gpt-5.4-mini`        | Budget and bounded-utility route                |
| `gpt-5.3-codex`       | Implementation and long-running coding          |
| `gpt-5.2`             | Planning, review, and orchestration (Pro plans) |
| `gpt-5.3-codex-spark` | Lightweight utility (Pro-only)                  |

## Plan Presets

| Plan     | Main Model    | Implementation | Utility             | Edit Mode | Plan Mode                  | Swarm        |
| -------- | ------------- | -------------- | ------------------- | --------- | -------------------------- | ------------ |
| `go`     | gpt-5.4-mini  | gpt-5.3-codex  | gpt-5.4-mini        | medium    | high main, medium utility  | conservative |
| `plus`   | gpt-5.3-codex | gpt-5.3-codex  | gpt-5.4-mini        | medium    | xhigh main, medium utility | standard     |
| `pro-5`  | gpt-5.2       | gpt-5.3-codex  | gpt-5.3-codex-spark | medium    | xhigh main, medium utility | aggressive   |
| `pro-20` | gpt-5.2       | gpt-5.3-codex  | gpt-5.3-codex-spark | medium    | xhigh main, medium utility | max          |

`gpt-5.3-codex-spark` is reserved for `pro-5` and `pro-20`. `go` and `plus` never materialize Spark.

## Agent-to-Model Mapping

Custom agent TOMLs are rewritten for the selected plan:

| Agent                      | Model Slot           |
| -------------------------- | -------------------- |
| athena, nemesis, odysseus  | Main (plan) model    |
| hephaestus                 | Implementation model |
| hermes, atalanta, calliope | Utility model        |

## Wrapper Routing

| Wrapper Mode                                                                         | Profile                                            |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `plan`, `review`, `orchestrate`                                                      | `openagentsbtw` (main)                             |
| `implement`, `accept`, `longrun`                                                     | Implementation model                               |
| `resume`                                                                             | Native `codex resume` with `openagentsbtw` profile |
| `triage`, `explore`, `trace`, `debug`, `docs`, `desloppify`, `handoff`, `test`, `qa` | `openagentsbtw-codex-mini`                         |
