# OAL Reboot Plan

This is a product plan, not a prompt plan. V3 is reference only.

## Phase 1 — Evidence and boundary setup

- [ ] Move/confirm original v3 reference under `v3_legacy/`.
- [ ] Remove “oabtw v4” wording from OAL product code and generated output.
- [ ] Inventory existing generated artifacts, source records, hooks, commands, tools, configs, and installer behavior.

## Phase 2 — Product spine

- [ ] Implement source loader for authored OAL source.
- [ ] Implement product validator for model allowlist, provider support, missing references, unsupported provider capabilities, and source/generated boundaries.
- [ ] Implement generated/source drift check.
- [ ] Implement acceptance command that fails until the end-to-end product works.

## Phase 3 — Provider-native rendering

- [ ] Render Codex-native artifacts: config, agent TOML, skills, AGENTS.md/instructions, hooks/runtime references.
- [ ] Render Claude Code-native artifacts: settings, agents/subagents, skills, CLAUDE.md/instructions, hooks.
- [ ] Render OpenCode-native artifacts: config, agents, commands, tools, permissions, instructions, hooks/plugin surfaces.
- [ ] Explicitly report unsupported provider capabilities instead of faking parity.

## Phase 4 — Deployment and ownership

- [ ] Implement deploy plan generation.
- [ ] Implement structured config merge preserving user-owned keys.
- [ ] Implement manifest ownership for full files, marked text blocks, and structured config keys.
- [ ] Implement dry-run/diff.
- [ ] Implement apply.
- [ ] Implement uninstall that removes only OAL-owned material.

## Phase 5 — Runtime hooks and tools

- [ ] Package hooks as executable `.mjs` scripts.
- [ ] Implement hook fixtures outside the source repo.
- [ ] Recover v3-grade completion/route contract behavior.
- [ ] Implement safety hooks: destructive command guard, secret guard, protected branch guard, generated drift guard.
- [ ] Implement OpenCode tools as runnable integrations when generated.

## Phase 6 — Product artifacts

- [ ] Agents/subagents have operational prompt bodies, not role blurbs.
- [ ] Commands/routes have actionable execution contracts, not two-line descriptors.
- [ ] Skills have full bodies and are provider-rendered.
- [ ] Model routing uses only the approved reboot model sets.

## Phase 7 — Acceptance

- [ ] Acceptance command renders all providers.
- [ ] Acceptance command deploys all providers into fixtures.
- [ ] Acceptance command uninstalls all providers from fixtures.
- [ ] Acceptance command executes hook fixtures.
- [ ] Acceptance command proves model allowlist and v3 isolation.
- [ ] Acceptance command fails on stub artifacts.
