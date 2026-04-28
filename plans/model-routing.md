# Model Routing Plan

## Goal

Models should code. Routing should put strong models on architecture and hard implementation, cheap models on bounded utility, and free OpenCode models behind measured fallbacks.

## Codex Model Set

Allowed runtime set from current user constraint:

| Model           | Efforts             | OAL Fit                                                                                  |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| `gpt-5.5`       | medium, high        | planning, architecture, research synthesis, orchestration, final risk review             |
| `gpt-5.3-codex` | medium, high, xhigh | implementation, debugging, refactors, code review, long coding loops                     |
| `gpt-5.4-mini`  | medium, high, xhigh | bounded utility, classification, docs checks, route selection, fast validation summaries |

Do not route Codex to unavailable models. OAL defaults must stay inside the supported model set.

## Codex Default Routes

| Route               | Default               | Fallback                                  | Reason                                       |
| ------------------- | --------------------- | ----------------------------------------- | -------------------------------------------- |
| `plan`              | `gpt-5.5 high`        | `gpt-5.5 medium`                          | needs architecture coherence                 |
| `research`          | `gpt-5.5 high`        | `gpt-5.3-codex high`                      | needs synthesis and source discipline        |
| `implement`         | `gpt-5.3-codex high`  | `gpt-5.3-codex xhigh` for hard failures   | coding-specialized path                      |
| `debug`             | `gpt-5.3-codex xhigh` | `gpt-5.5 high` for cross-system diagnosis | long causal tracing                          |
| `review`            | `gpt-5.3-codex high`  | `gpt-5.5 high` for architecture risk      | code-specific risk detection                 |
| `utility`           | `gpt-5.4-mini medium` | `gpt-5.4-mini high`                       | cheap bounded work                           |
| `classify_contract` | `gpt-5.4-mini high`   | `gpt-5.5 medium`                          | semantic classification, not final authority |

## OpenCode Free Fallback Set

User-provided free models:

- `opencode/nemotron-3-super-free`
- `opencode/minimax-m2.5-free`
- `opencode/ling-2.6-flash-free`
- `opencode/hy3-preview-free`
- `opencode/big-pickle`

## OpenCode Initial Routes

These are defaults until OAL benchmark fixtures produce evidence:

| Route       | Order                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implement` | `opencode/big-pickle`, `opencode/minimax-m2.5-free`, `opencode/hy3-preview-free`, `opencode/ling-2.6-flash-free`, `opencode/nemotron-3-super-free` |
| `debug`     | `opencode/minimax-m2.5-free`, `opencode/big-pickle`, `opencode/hy3-preview-free`, `opencode/nemotron-3-super-free`, `opencode/ling-2.6-flash-free` |
| `utility`   | `opencode/ling-2.6-flash-free`, `opencode/hy3-preview-free`, `opencode/nemotron-3-super-free`, `opencode/minimax-m2.5-free`, `opencode/big-pickle` |
| `review`    | `opencode/minimax-m2.5-free`, `opencode/big-pickle`, `opencode/nemotron-3-super-free`, `opencode/hy3-preview-free`, `opencode/ling-2.6-flash-free` |

## Benchmark Fixtures

Before beta, run each model through:

- small bug fix with tests
- multi-file refactor with constraints
- failing test triage
- docs-only rewrite
- no-advice contract classification
- command-output summarization

Record:

- success/fail
- tool-call correctness
- hallucinated file/path rate
- unsolicited-advice rate
- validation evidence rate
- average turns
- output verbosity

Routing changes require fixture evidence, not vibe.

## Config Rules

- Model policy is data, not prose-only.
- Platform adapters must refuse unknown default model IDs.
- Fallbacks must be explicit by route.
- User overrides are allowed but `oal check` warns if they leave supported set.
