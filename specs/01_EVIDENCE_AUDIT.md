# deprecated product wording baseline behavior Evidence Audit

Pinned reference: `xsyetopz/OpenAgentLayer@bd7fb00663153af0aca90b12b9c525895f1a7a0d`.

## 1. baseline behavior was already a generator/deployer, not just prompts

Evidence:

- `package.json` defines generation and validation scripts: `generate`, `generate:repo`, `check:generated`, and `test`.
- `scripts/build.mjs` creates a clean output directory, copies static assets, then invokes `scripts/generate.mjs --out <dir>`.
- `scripts/generate.mjs` loads the source catalog and renders agents, skills, hook maps, wrappers, configs, OpenCode plugin code, and provider templates.
- `scripts/install/cli.mjs` builds artifacts, prompts for provider selection, installs Claude/Codex/OpenCode/Copilot support, handles model plans, installs wrapper shims, writes RTK/Caveman/Context7/Playwright surfaces, and validates runtime prerequisites.

Interpretation:

baseline behavior’s strongest product idea was not the Greek roles. It was the fact that authored source plus scripts produced real installable provider surfaces. OAL must keep this product spine and make it more direct, provider-native, and testable.

## 2. baseline behavior prompt bodies were operational, not one-line role cards

Evidence:

- `source/agents/atalanta/prompt.md` defines identity, constraints, behavioral rules, capabilities, four execution phases, framework command examples, and a structured output format.
- `source/agents/hephaestus/prompt.md` forbids TODOs/stubs/placeholders, demo substitutes, broad rewrites, and test weakening; it defines failure recovery, complete implementations, scope discipline, blocker contract, and verification output.
- `source/agents/athena/prompt.md` defines read-only architecture behavior, evidence gates, clarification gates, planning phases, risk/deployment output, and explicit assumptions.

Interpretation:

Any generated OAL agent artifact that collapses to `Purpose`, `Triggers`, `Workflow: run checks`, or a few TOML lines is a regression. baseline behavior prompts were multi-section operating manuals. OAL prompts must be product-grade assets rendered from source, not generated stubs.

## 3. baseline behavior command routes were not all equal

Evidence:

- `source/commands/codex/implement.json` contains route kind, blocked behavior, docs/tests-only rules, prototype-scaffolding rejection, profile selection, and a long implementation contract.
- `source/commands/codex/plan.json` explicitly treats native `/plan` as reasoning mode, not role selection, and adds assumption/failure-mode scaffolding.
- `source/commands/opencode/provider implement route.json` is much thinner: name, description, agent, route kind, and a short prompt template.

Interpretation:

baseline behavior had stronger Codex route contracts than OpenCode route contracts. OAL must not flatten all providers to a weak common denominator. It needs one route intent with provider-native renderers and provider-specific depth where the provider supports it.

## 4. baseline behavior hooks were a major success area

Evidence:

- Commit `bd7fb...` hardens `stop-scan.mjs` to reject weak `BLOCKED:` completions unless they include `Attempted`, `Evidence`, and `Need` lines.
- `source/hooks/policies/subagent-route-context.json` maps route context to Claude `SubagentStart`, OpenCode `tool.execute.before`, and Copilot fallback events, while explicitly marking Codex unsupported for Claude-style `SubagentStart`.
- `source/hooks/policies/staged-secret-guard.json` maps OpenCode git hook rules to staged secret and `.env` guards.

Interpretation:

baseline behavior did not merely “describe hooks”; it had executable `.mjs` runtime behavior, route contracts, stop-gates, and provider-specific mapping. OAL must preserve executable `.mjs` hooks and improve provider-native mapping instead of turning hooks into metadata cards.

## 5. baseline behavior model routing existed but should be rebooted

Evidence:

- `source/subscriptions.mjs` defines Codex plans, swarm policies, agent assignments, model profiles, utility/implementation/runtime profiles, Claude plans, and Copilot plans.
- baseline behavior used models such as `blocked Codex model`, `gpt-5.4-mini`, and `gpt-5.3-codex`, and used `xhigh` in Plus implementation-related profiles.
- baseline behavior Claude Max plans used `blocked Claude long-context model` in some places.

Interpretation:

OAL must carry forward model-routing as a first-class product feature, but with the updated constraints:

- Codex allowed: `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.3-codex`.
- Codex disallowed: blocked Codex models.
- Claude allowed: `claude-opus-4-6`, `claude-opus-4-6[1m]`, `claude-sonnet-4-6`, `claude-haiku-4-5`.
- Claude disallowed: `blocked Claude model`, `blocked Claude long-context model`.

## 6. baseline behavior had too much monolithic generation logic

Evidence:

- `scripts/generate.mjs` contains renderer logic for skill bodies, agent rendering, Codex agent TOML, OpenCode agent prompt rendering, hook mapping, hook manifest Markdown, and OpenCode git-hook shell generation.
- It also handles platform-specific token replacements, reference/script copying, and provider output paths.

Interpretation:

baseline behavior’s generator worked, but it was too much of a grab-bag. OAL should keep the generator/deployer product spine while splitting responsibilities by product function: source load, validate, render provider, write generated output, deploy, uninstall, and runtime hooks. This split should be code-driven, not schema-driven.

## 7. baseline behavior tests proved generation behavior, but too much was snapshot/assertion style

Evidence:

- `tests/generated-artifacts.test.mjs` runs `scripts/build.mjs --out <tmp>` and checks generated prompts, skills, Codex defaults, wrappers, Copilot hooks, and docs.
- Some checks were useful because they verified rendered output and generated cross-platform assets.
- Some checks were brittle because they matched strings rather than proving installed product behavior.

Interpretation:

OAL acceptance must keep generated-output checks, but must add end-to-end deploy/uninstall/runtime fixture checks. A generated artifact is not sufficient. It must be rendered, deployed, tracked in a manifest, and uninstallable.

## 8. baseline behavior already recognized provider differences

Evidence:

- Codex docs say baseline behavior uses documented Codex surfaces only: `AGENTS.md`, custom agents with `developer_instructions`, plugin skills, managed profiles in `config.toml`, and hooks.
- OpenCode docs say OpenCode stays native-first: role prompts, skills, generated commands, plugin guardrails, native continuation, `/sessions`, `/compact`, and `task_id`.
- The subagent route context policy explicitly says Codex lacks the Claude-style `SubagentStart` event.

Interpretation:

OAL must not attempt “tooling-agnostic parity.” It should be tooling-agnostic at the source-intent layer and provider-native at the output layer.
