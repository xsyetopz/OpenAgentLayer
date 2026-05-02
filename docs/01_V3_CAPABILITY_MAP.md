# v3 Capability Map: What to Recover, What to Reject

This document maps original v3 capabilities into OAL reboot requirements. It is not a porting guide. It identifies what was real product behavior and what should be redesigned.

## Agent prompts

### v3 behavior

v3 maintained agent metadata and full prompt bodies under `source/agents/<agent>/`. Prompt bodies were multi-section operating manuals. They included identity, constraints, behavioral rules, workflow/protocol, capabilities, reference tables, and output format.

Examples:

- Athena: architecture analysis, evidence gate, clarification gate, planning protocol.
- Hephaestus: implementation discipline, production-only rule, blocker contract, anti-placeholder behavior.
- Atalanta: test command discovery, execution phases, failure analysis, loop guard.
- Nemesis: read-only review, file:line evidence, severity scale, specific fixes.

### Recover in OAL

- Agents are production routing units, not personalities.
- Provider artifacts must embed operational prompt bodies, not condensed summaries.
- Metadata is only valid if used by renderers and deployers.
- Agent contract must include tools, sandbox/write mode, model route, allowed skills, route ownership, validation behavior, and output contract.

### Reject in OAL

- One-paragraph role prompts.
- Prompt summaries that replace operating manuals.
- Decorative Greek-agent flavor.
- Agent source files not consumed by generator.
- Agents added before provider rendering/deploy can emit them correctly.

## Commands and routes

### v3 behavior

v3 had per-provider command catalogs, such as `source/commands/codex/plan.json`. The Codex `plan` record had a profile, route kind, docs/test allowances, prototype-scaffolding flag, and a prompt that described planning behavior.

This is partly good: commands carried route contract fields, not just text.

### Recover in OAL

- OAL route definitions should carry route kind, owner, allowed outputs, permissions, skill dependencies, hook expectations, validation behavior, and provider overlays.
- Provider renderers should emit native commands/routes from OAL route source.
- Command bodies must be operational and specific enough to guide actual work.

### Reject in OAL

- Per-provider duplication when the OAL route is identical.
- Two-line command files that only say “Owner agent,” “Permissions,” and “Output.”
- Command cards not rendered into provider-native command surfaces.
- Command docs that are not executable product behavior.

## Hooks

### v3 behavior

v3 hooks were executable `.mjs` files. The stop-scan hook read stdin, parsed route contracts, inspected git diffs, classified file changes, detected placeholders/prototype scaffolding, required execution evidence, rejected weak blocked results, warned on soft placeholder/prose drift, and blocked invalid route completions.

The hook policy model also represented provider-specific surfaces: Claude hook events, Codex hook events, Copilot fallback events, OpenCode plugin/git-hook surfaces, and unsupported provider cases.

### Recover in OAL

- Hooks remain executable `.mjs` after deployment.
- Hooks are packaged so they work outside the source repo.
- Hooks have fixtures that prove behavior.
- OAL hook policies describe intent; provider adapters render provider-native hook bindings.
- Unsupported provider hook capabilities are explicit.

### Reject in OAL

- Hook descriptions without executable runtime.
- Hooks that only print messages but do not enforce behavior.
- Tooling-agnostic hooks that hide provider differences.
- Hook policies that are not rendered or deployed.

## Installer and deployment

### v3 behavior

v3 installer supported multiple providers and many optional surfaces: Claude, OpenCode, Codex, Copilot, RTK, Caveman, Context7, DeepWiki MCP, Playwright CLI, wrapper shims, Codex plugin payloads, and provider plan presets.

### Recover in OAL

- OAL should deploy real provider-native artifacts.
- Deploy should preserve user-owned configuration.
- Deploy should be reversible.
- Deploy should produce a manifest of owned files, blocks, and structured config keys.
- Optional integrations should be scoped and explicit.

### Reject in OAL

- Installer as one giant imperative script.
- Hidden writes without manifest ownership.
- User config overwrite risks.
- Provider-specific deployment logic mixed with rendering logic.

## Model routing

### v3 behavior

v3 had plan presets and swarm policies. It assigned models per role and had profiles such as main, utility, implementation, approvalAuto, and runtimeLong.

### Recover in OAL

- Plan-aware routing.
- Separate utility, implementation, orchestration, and long-runtime behavior.
- Concurrency/swarm limits that respect usage cost.

### Reject in OAL

- Unsupported reboot models.
- Default xhigh use.
- Hardcoding older Claude Opus versions.
- Model tables in docs only; model allowlist must be enforced by product validation.

## Source/generation model

### v3 behavior

v3 had an authored source tree and generated platform targets. It loaded agents, skills, commands, hook policies, and guidance from `source/`, then rendered provider output.

### Recover in OAL

- Authored source as source of truth.
- Generated provider output as output, not hand-authored source.
- Renderers that map OAL intent to provider-native artifacts.

### Reject in OAL

- Generated artifacts modified directly.
- Catalogs that exist but are not consumed.
- Source records that do not produce provider output.
- Provider output that is shallow or toy-like.
