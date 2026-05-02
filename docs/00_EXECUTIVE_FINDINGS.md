# OAL Reboot: v3 Reference Audit — Executive Findings

Evidence base: `xsyetopz/OpenAgentLayer` at commit `bd7fb00663153af0aca90b12b9c525895f1a7a0d`, described by the user as the original v3 reference.

This audit treats v3 as evidence, not as a codebase to port. OAL must not say “oabtw v4” in product code, generated artifacts, docs, CLI names, config keys, or instructions. Internally, humans may remember that OAL descends from openagentsbtw; product language should be OpenAgentLayer / OAL only.

## Core finding

v3 succeeded because it was a working cross-provider artifact generator with real hooks, real installer behavior, and operational agent prompts. It failed because the generation/deployment architecture was too implicit, too provider-entangled, and too dependent on generated output living as repo surface. A reboot must preserve the things that were real while deleting the inherited shape that makes agents produce mockups.

OAL v4 must be a full product, not a cleaned v3 tree. The product is a generator/deployer that emits real provider-native artifacts for Codex, Claude Code, and OpenCode. Product completion means generation, validation, deployment, uninstall, runtime hooks, model routing, and provider artifact inspection all work end-to-end.

## What v3 did well

### 1. v3 had actual operational prompts, not role blurbs

The v3 agent prompts were multi-section operating manuals. Atalanta included identity, constraints, behavioral rules, protocol phases, supported frameworks, and output format. Athena included architecture planning protocol, direct-assessment rules, evidence gates, and a clarification gate. Hephaestus included implementation constraints, blocker contract, production-only rules, and anti-placeholder behavior. Nemesis included review protocol, severity model, evidence requirements, and specific output format.

This matters because v4 outputs such as “You are aphrodite…” or two-line command cards are regressions. They are not “smaller v4”; they are weaker than v3.

### 2. v3 had real route/completion enforcement

The v3 stop-scan hook was not just prose. It inspected git diffs, route markers, transcript evidence, placeholder patterns, prototype scaffolding, docs-only/test-only conditions, execution evidence, and weak `BLOCKED` reports. It returned block/warn/pass behavior through executable hook code.

This is the bar for v4 hooks: hooks must be executable runtime programs with fixture coverage, not policy descriptions.

### 3. v3 recognized provider differences

The `subagent-route-context` policy explicitly supported Claude `SubagentStart`, OpenCode `tool.execute.before` on the `task` tool, Copilot fallback events, and marked Codex unsupported for that Claude-style subagent event. That is correct product thinking: provider differences are modeled rather than hidden.

V4 must keep this principle. “Tooling agnostic” should mean one OAL policy model with provider-native adapters, not fake parity.

### 4. v3 shipped a real installer/deployer surface

v3 installer code handled multi-provider installation, plan selection, Caveman mode, Codex plugin payloads, Codex wrappers, RTK surfaces, Context7, DeepWiki MCP, Playwright CLI, platform-specific wrapper scripts, Node/Bun checks, and provider-specific scopes.

This was messy, but it was product behavior, not a toy.

### 5. v3 had an authored-source → generated-target model

v3 README and architecture docs described canonical source under `source/`, generated targets under `claude/`, `codex/`, `opencode/`, and `copilot/`, and a generator entrypoint. This is directionally right.

## Where v3 fell short

### 1. Generator shape was too monolithic

`scripts/generate.mjs` rendered skills, agents, hooks, provider manifests, OpenCode git hooks, and provider-specific directories in one large file. It also contained token replacement, filesystem writing, provider rendering, hook manifest generation, and shell rendering logic in one place.

V4 must not become “one giant generator script plus helper islands.” It needs a product spine where source loading, rendering, runtime hook packaging, and deployment planning are separate responsibilities.

### 2. Provider command/source model was duplicated

v3 put commands under `source/commands/{codex,copilot,opencode}/`. That works but encourages provider-specific duplication before the OAL route is defined. V4 should define OAL routes once, then render provider-native command surfaces per provider, while still allowing provider overlays.

### 3. Generated output doubled as repo product surface

v3 committed generated provider directories and also used them as install payloads. This made generated/source boundaries blurry. It worked for distribution, but v4 needs stronger ownership: authored source, generated inspection output, deployable package payload, and installed artifact state must be distinct.

### 4. Model routing aged and overreached

v3 used models now rejected by the user for OAL reboot: gpt-5.4, gpt-5.2, Claude Opus 4-6 variants, and sometimes xhigh-heavy Codex assignments. V4 must use only the user-approved model set:

- Codex: `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.3-codex`.
- Claude: `claude-opus-4-7`, `claude-opus-4-7[1m]`, `claude-sonnet-4-6`, `claude-haiku-4-5`.

### 5. Install behavior was real but too intertwined

The installer parsed many concerns in one CLI: provider selection, model presets, optional tools, wrapper shims, config env, RTK, OpenCode scope, DeepWiki, Context7, Playwright, Codex plugin payloads, and Claude settings. V4 should retain the breadth but turn it into explicit install plans with manifest ownership and dry-run/diff/uninstall behavior.

### 6. v3 did not go far enough on tooling-agnostic-but-provider-native design

v3 understood some differences, but the architecture still mixed provider concerns at generation time. V4 needs a proper OAL capability model:

- OAL route / skill / hook / tool / agent source.
- Provider adapter for Codex, Claude Code, OpenCode.
- Provider-specific unsupported capability reporting.
- Provider-specific config schema awareness.
- Provider-specific runtime hook packaging.

Tooling-agnostic does not mean “same artifact everywhere.” It means “same OAL intent, provider-native result.”

## Reboot mandate

OAL v4 should not copy v3. It should study v3 and rebuild the product around these rules:

1. V3 is reference only.
2. OAL code must not mention “oabtw v4.”
3. Generated artifacts must be real provider-native artifacts.
4. Hooks must be executable `.mjs` programs with fixtures.
5. Tools must be runnable integrations, not names in metadata.
6. Commands must be provider-native command surfaces with actionable execution contracts.
7. Agent prompts must be operational manuals when emitted, not role blurbs.
8. Deploy/uninstall must be manifest-owned and reversible.
9. Source/generated boundaries must be explicit.
10. Passing means end-to-end product behavior works, not that files exist.
