# V3 capability recovery matrix

Purpose: track v3 behavior recovered as v4 source-native OAL capability.

Authority: implementation audit. `v3_to_be_removed/` is evidence only, not an active source tree, compatibility target, or legacy layer.

Evidence paths:

- `v3_to_be_removed/source/commands/codex/`
- `v3_to_be_removed/source/commands/opencode/`
- `v3_to_be_removed/source/skills/`
- `v3_to_be_removed/source/hooks/policies/`

Quality evidence:

- Command/skill/provider render coverage: `packages/render/__tests__/src/v3-capability-recovery.test.ts`
- Full source-graph native surface coverage: `packages/render/__tests__/src/native-surface-completeness.test.ts`
- Source validation coverage: `packages/source/__tests__/src/record-validation.test.ts`
- Runtime router/script parity coverage: `packages/runtime/__tests__/src/recovered-v3-policies.test.ts`
- All-policy router/script parity coverage: `packages/runtime/__tests__/src/policy-parity.test.ts`

## Command recovery

| Capability | Source | Quality status | Render/test evidence |
| --- | --- | --- | --- |
| Debug route | `source/commands/oal-debug/` | Specific hermes/debug procedure; no generic recovery scaffold | Rendered for Codex command skill, Claude command, OpenCode command |
| Explore route | `source/commands/oal-explore/` | Specific repository mapping and evidence packet procedure | Rendered for Codex command skill, Claude command, OpenCode command |
| Implement route | `source/commands/implement/` | Specific hephaestus execution procedure with validation gates | Rendered for Codex command skill, Claude command, OpenCode command |
| Orchestrate route | `source/commands/orchestrate/` | Specific council/delegation procedure with merge gates | Rendered for Codex command skill, Claude command, OpenCode command |
| Review route | `source/commands/oal-review/` | Specific nemesis review procedure with blocking/non-blocking findings | Rendered for Codex command skill, Claude command, OpenCode command |
| Test route | `source/commands/oal-test/` | Specific atalanta validation procedure with evidence capture | Rendered for Codex command skill, Claude command, OpenCode command |
| Trace route | `source/commands/oal-trace/` | Specific call-path/data-flow/dependency tracing procedure | Rendered for Codex command skill, Claude command, OpenCode command |
| Validate route | `source/commands/validate/` | Specific cross-provider validation procedure with status matrix | Rendered for Codex command skill, Claude command, OpenCode command |
| Documentation route | `source/commands/oal-document/` | Specific calliope docs procedure with stale-doc and source-truth checks | Rendered for Codex command skill, Claude command, OpenCode command |
| Audit route | `source/commands/audit/` | Specific nemesis audit procedure with severity and remediation lanes | Rendered for Codex command skill, Claude command, OpenCode command |
| Planning routes | `source/commands/plan-feature/`, `source/commands/plan-refactor/`, `source/commands/resume/` | Specific decision, sequencing, and continuation procedures | Rendered for Codex command skill, Claude command, OpenCode command |
| Design/taste routes | `source/commands/design-taste-*` | Specific taste/design-polish procedures with no generic route text | Rendered for Codex command skill, Claude command, OpenCode command |

Source guard: `generic-command-body` rejects recovered commands that still contain the old generic scaffold phrase.

## Skill recovery

| Skill family | Source | Quality status | Test evidence |
| --- | --- | --- | --- |
| Debug/research/trace | `source/skills/debug/`, `source/skills/explore/`, `source/skills/trace/` | OAL-local first-party Agent Skills bodies with concrete procedures and evidence output | Source validation rejects barebones skill bodies and copied v3 active-source metadata |
| Planning/review/test | `source/skills/decide/`, `source/skills/review/`, `source/skills/test/` | OAL-local first-party Agent Skills bodies tuned for v4 routing and validation | Source validation rejects `source_package = "v3-evidence"` |
| Docs/prose | `source/skills/document/`, `source/skills/deslop/`, `source/skills/plain-language/` | OAL-local first-party bodies; no v3-managed active source metadata | Provider render tests verify full Agent Skills surfaces |
| Engineering practices | `source/skills/elegance/`, `source/skills/errors/`, `source/skills/git-workflow/`, `source/skills/perf/`, `source/skills/security/`, `source/skills/style/` | OAL-local first-party procedures for package-module v4 work | Source validation rejects placeholders and unnecessary wrappers |
| Session/agent workflow | `source/skills/handoff/`, `source/skills/onboard/`, `source/skills/openagentsbtw/` | OAL-local first-party workflow bodies for v4 role routing | Provider render tests verify skill directory/file layout |
| Caveman/taste vendor skills | `source/skills/caveman-*`, `source/skills/taste-*` | Upstream-synced third-party-backed skills, not manual local copies | Upstream attribution and third-party source-path validation |

Source guard: `copied-v3-skill-source` rejects skill records that cite `v3-evidence` as active source package.

## Recovered hook quality

| V3 behavior | V4 policy source | Quality status | Runtime evidence |
| --- | --- | --- | --- |
| Failure circuit | `source/policies/failure-circuit/` | Recovered as deterministic runtime policy and self-contained `.mjs` script | Router and rendered script both return `warn` for repeated failures |
| Prompt git context | `source/policies/prompt-git-context/` | Recovered as prompt-context enrichment policy | Router and rendered script both return `context` for dirty branch metadata |
| Protected branch confirmation | `source/policies/protected-branch-confirm/` | Recovered as mutation blocker for protected branches | Router and rendered script both return `deny` for unconfirmed protected push |
| Staged secret scan | `source/policies/staged-secret-guard/` | Recovered as staged diff/content secret blocker | Router and rendered script both return `deny` for secret-like diff content |
| Subagent route context | `source/policies/subagent-route-context/` | Recovered as route context injection policy | Router and rendered script both return `context` for route metadata |
| Write-quality scan | `source/policies/write-quality/` | Recovered as generated-output quality blocker | Router and rendered script both return `deny` for placeholder/TODO output |

Do not port v3 names mechanically. Recover behavior only when it directly helps Codex, Claude, or OpenCode users install, route, run, validate, or debug OAL.
