# Agent role assignment study

Purpose: map expanded Greek roles to Codex and Claude model presets.

Authority: study input for `../../specs/model-routing.md`.

Related studies:

- [Codex model balance](codex-model-balance-study.md)
- [Claude Code model balance](claude-code-model-balance-study.md)
- [Expanded Greek taxonomy](expanded-greek-agent-taxonomy.md)

## Codex assignments

### `codex-plus`

| Role | Model | Effort | Reason |
| --- | --- | --- | --- |
| Athena | `gpt-5.4` | `medium` | Architecture without `gpt-5.5` baseline cost. |
| Metis | `gpt-5.4` | `medium` | Tradeoff analysis. |
| Themis | `gpt-5.4` | `medium` | Spec consistency. |
| Hephaestus | `gpt-5.3-codex` | `medium` | Coding-optimized implementation. |
| Ares | `gpt-5.3-codex` | `medium` | Mechanical edits. |
| Hermes | `gpt-5.4-mini` | `medium` | Efficient tracing. |
| Nemesis | `gpt-5.3-codex` | `medium` | Code review. |
| Dike | `gpt-5.4-mini` | `medium` | Contract audit. |
| Hecate | `gpt-5.4` | `medium` | Risk scan. |
| Atalanta | `gpt-5.4-mini` | `medium` | Validation. |
| Apollo | `gpt-5.4-mini` | `low` | Log/diagnostic scan. |
| Asclepius | `gpt-5.3-codex` | `medium` | Fix verification. |
| Calliope | `gpt-5.4-mini` | `medium` | Docs. |
| Mnemosyne | `gpt-5.4-mini` | `low` | Memory/context summaries. |
| Clio | `gpt-5.4-mini` | `medium` | History/evidence. |
| Odysseus | `gpt-5.4` | `medium` | Coordination. |
| Iris | `gpt-5.4-mini` | `low` | Handoff formatting. |
| Aphrodite | `gpt-5.4` | `medium` | UI critique. |
| Daedalus | `gpt-5.3-codex` | `medium` | UI implementation. |
| Hestia | `gpt-5.3-codex` | `medium` | Safety hardening. |
| Argus | `gpt-5.4-mini` | `medium` | Broad scan. |

### `codex-pro-5`

| Role | Model | Effort |
| --- | --- | --- |
| Athena | `gpt-5.5` | `high` |
| Metis | `gpt-5.5` | `high` |
| Themis | `gpt-5.4` | `high` |
| Hephaestus | `gpt-5.3-codex` | `medium` |
| Ares | `gpt-5.3-codex` | `medium` |
| Hermes | `gpt-5.4-mini` | `medium` |
| Nemesis | `gpt-5.3-codex` | `high` |
| Dike | `gpt-5.3-codex` | `high` |
| Hecate | `gpt-5.4` | `high` |
| Atalanta | `gpt-5.4-mini` | `high` |
| Apollo | `gpt-5.4-mini` | `medium` |
| Asclepius | `gpt-5.3-codex` | `high` |
| Calliope | `gpt-5.4-mini` | `high` |
| Mnemosyne | `gpt-5.4-mini` | `medium` |
| Clio | `gpt-5.4-mini` | `medium` |
| Odysseus | `gpt-5.5` | `high` |
| Iris | `gpt-5.4-mini` | `medium` |
| Aphrodite | `gpt-5.4` | `high` |
| Daedalus | `gpt-5.3-codex` | `high` |
| Hestia | `gpt-5.3-codex` | `high` |
| Argus | `gpt-5.4-mini` | `medium` |

### `codex-pro-20`

Use `codex-pro-5` assignments, with these allowed explicit upgrades:

- Athena: `xhigh` for deep architecture route.
- Metis: `xhigh` for contradiction-resolution route.
- Nemesis: `xhigh` for high-risk regression/security review.
- Hecate: `gpt-5.5 high` for hidden-risk scans.
- Odysseus: `gpt-5.5 high` remains default; `xhigh` only for stuck orchestration.

## Claude assignments

### `claude-max-5`

| Role | Model | Effort | Reason |
| --- | --- | --- | --- |
| Athena | `opusplan` | `high` | Opus planning, Sonnet execution if route turns active. |
| Metis | `opus` | `high` | Tradeoffs. |
| Themis | `sonnet` | `high` | Spec consistency. |
| Hephaestus | `sonnet` | `medium` | Implementation. |
| Ares | `sonnet` | `medium` | Mechanical edits. |
| Hermes | `haiku` or `sonnet` | `medium` | Haiku for narrow trace; Sonnet for deep trace. |
| Nemesis | `sonnet` | `high` | Review. |
| Dike | `sonnet` | `high` | Contract audit. |
| Hecate | `opus` | `high` | Hidden risk. |
| Atalanta | `haiku` or `sonnet` | `medium` | Haiku for logs; Sonnet for test triage. |
| Apollo | `haiku` | `low` | Diagnostics. |
| Asclepius | `sonnet` | `high` | Failure recovery. |
| Calliope | `haiku` or `sonnet` | `medium` | Haiku for summaries; Sonnet for authoritative docs. |
| Mnemosyne | `haiku` | `low` | Memory summaries. |
| Clio | `haiku` or `sonnet` | `medium` | Evidence studies. |
| Odysseus | `opusplan` | `high` | Orchestration. |
| Iris | `haiku` | `low` | Handoff formatting. |
| Aphrodite | `sonnet` | `high` | UI/design. |
| Daedalus | `sonnet` | `high` | UI implementation. |
| Hestia | `sonnet` | `high` | Security/install hardening. |
| Argus | `haiku` or `sonnet` | `medium` | Scan width decides model. |

### `claude-max-20`

Use `claude-max-5` assignments, with these allowed explicit upgrades:

- Athena: `opus[1m]` for huge architecture corpus.
- Metis: `opus xhigh` for difficult contradiction resolution.
- Nemesis: `opus high` or `opus[1m]` for wide audit.
- Hecate: `opus high` for hidden-risk analysis.
- Odysseus: `opusplan high`; `opus[1m]` only for huge multi-agent state.
- Clio: `sonnet[1m]` for large archive study.

## Exact Opus 4.6 routes

If a role must use Opus 4.6 specifically:

- emit `claude-opus-4-6`;
- emit `claude-opus-4-6[1m]` only for explicit long-context route;
- do not emit `opus`, because `opus` currently resolves to Opus 4.7 on Anthropic API.

## Handoff contracts

Every role output must include:

- result;
- evidence;
- blockers;
- changed files or inspected files;
- next owned action if route continues.

Subagents must not invent work beyond their packet.

