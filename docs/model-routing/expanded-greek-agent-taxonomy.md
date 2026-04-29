# Expanded Greek agent taxonomy

Purpose: define the v4 Greek-named role space for OpenAgentLayer.

Authority: study input for `../../specs/model-routing.md` and source agent records.

## Design rule

OAL v4 is not limited to the v3 seven-role set. Agent roles are source data. New Greek-named primary agents and subagents can be added whenever a distinct mission, permission boundary, model class, or cost profile makes routing better.

## Role families

### Strategy

| Role | Mode | Mission | Route kind | Model class | Effort ceiling |
| --- | --- | --- | --- | --- | --- |
| Athena | primary/subagent | architecture decisions, plans, migrations | `readonly` | strongest planner | `high`, explicit deep `xhigh` |
| Metis | subagent | option analysis, tradeoffs, contradiction resolution | `readonly` | strongest planner | `high` |
| Themis | subagent | policy/spec consistency, decision law | `readonly` | strong reviewer/planner | `high` |

### Execution

| Role | Mode | Mission | Route kind | Model class | Effort ceiling |
| --- | --- | --- | --- | --- | --- |
| Hephaestus | primary/subagent | production implementation | `edit-required` | coding-optimized | `high` |
| Ares | subagent | contained mechanical refactors, migrations, repetitive edits | `edit-required` | coding-optimized or efficient | `medium` |
| Hermes | subagent | repo tracing, API discovery, source mapping | `readonly` | efficient research | `medium` |

### Review and risk

| Role | Mode | Mission | Route kind | Model class | Effort ceiling |
| --- | --- | --- | --- | --- | --- |
| Nemesis | primary/subagent | correctness/regression/security review | `readonly` | coding reviewer | `high`, explicit deep `xhigh` |
| Dike | subagent | spec compliance, acceptance criteria, contract audit | `readonly` | reviewer | `high` |
| Hecate | subagent | hidden edge cases, cross-boundary risk, migration traps | `readonly` | strongest reviewer when needed | `high` |

### Validation

| Role | Mode | Mission | Route kind | Model class | Effort ceiling |
| --- | --- | --- | --- | --- | --- |
| Atalanta | primary/subagent | tests, repros, command evidence | `execution-required` | efficient validation | `high` |
| Apollo | subagent | diagnostics, logs, signal extraction | `execution-required` | efficient validation | `medium` |
| Asclepius | subagent | failure triage, fix verification, recovery paths | `execution-required` | coding/validation blend | `high` |

### Documentation and memory

| Role | Mode | Mission | Route kind | Model class | Effort ceiling |
| --- | --- | --- | --- | --- | --- |
| Calliope | primary/subagent | docs, ADRs, handoffs, changelogs | `readonly` or `edit-required` by command | efficient docs | `high` |
| Mnemosyne | subagent | memory extraction, session compaction, context summaries | `readonly` | small/efficient | `medium` |
| Clio | subagent | historical study, evidence timelines, source archive mapping | `readonly` | efficient research | `medium` |

### Coordination

| Role | Mode | Mission | Route kind | Model class | Effort ceiling |
| --- | --- | --- | --- | --- | --- |
| Odysseus | primary/subagent | multi-agent orchestration, packetized delegation | `edit-required` when coordinating implementation | strongest planner | `high` |
| Iris | subagent | message passing, handoff normalization, progress aggregation | `readonly` | small/efficient | `medium` |

### UX and design

| Role | Mode | Mission | Route kind | Model class | Effort ceiling |
| --- | --- | --- | --- | --- | --- |
| Aphrodite | primary/subagent | visual design critique and polish | `edit-required` for UI work | visual/coding blend | `high` |
| Daedalus | subagent | component systems, layout mechanics, design implementation | `edit-required` | coding/design blend | `high` |

### Security and policy

| Role | Mode | Mission | Route kind | Model class | Effort ceiling |
| --- | --- | --- | --- | --- | --- |
| Hestia | subagent | secret handling, safe defaults, install hardening | `readonly` or `edit-required` by command | security reviewer | `high` |
| Argus | subagent | broad watchguard, suspicious pattern scan, generated drift audit | `readonly` | efficient scanner/reviewer | `medium` |

## Routing principles

- Primary agents own user-facing route identity.
- Subagents own narrow bounded work.
- Expensive models go to Strategy, Coordination, and high-risk Review.
- Efficient models go to helper, memory, docs, diagnostics, and bounded research.
- Implementation routes use coding-optimized models.
- 1M context routes are explicit modifiers, not role defaults.
- Roles must have handoff contracts: input packet, output packet, evidence format, blocker format.

## Minimum v4 role set

OAL should seed at least these roles:

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

