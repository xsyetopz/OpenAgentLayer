# v3 architecture study

Purpose: evidence-backed study of `v3_to_be_removed/`.

Authority: research only. V4 behavior is defined in `../specs/`.

## High-level shape

V3 used one authored source tree and multiple generated surface outputs.

Evidence:

- `v3_to_be_removed/README.md` describes canonical source under `source/` and generated targets `claude/`, `codex/`, `opencode/`, and `copilot/`.
- `v3_to_be_removed/source/` contains `agents`, `skills`, `commands`, `guidance`, `hooks`, `shared`, `platform-overlays`, and catalog code.
- `v3_to_be_removed/scripts/generate.mjs` loads catalog data and emits platform artifacts.

## Catalog

Catalog loader responsibilities:

- `v3_to_be_removed/source/catalog/loaders.mjs` reads named JSON children for agents and skills.
- `v3_to_be_removed/source/catalog/loaders.mjs` reads JSON command directories for Codex, Copilot, and OpenCode.
- `v3_to_be_removed/source/catalog/loaders.mjs` reads hook policy JSON records.
- `v3_to_be_removed/source/catalog/loaders.mjs` reads project guidance Markdown.
- `v3_to_be_removed/source/catalog/items.mjs` aggregates catalog categories.

Lesson: v4 should keep centralized catalog loading but make records typed and source-format-first.

## Generator

V3 generator responsibilities concentrated in one file:

- skills: `v3_to_be_removed/scripts/generate.mjs`
- agents: `v3_to_be_removed/scripts/generate.mjs`
- hooks and route contracts: `v3_to_be_removed/scripts/generate.mjs`
- commands: `v3_to_be_removed/scripts/generate.mjs`
- guidance and prompts: `v3_to_be_removed/scripts/generate.mjs`
- optional IDE files: `v3_to_be_removed/scripts/generate.mjs`

Lesson: v4 should split loading, normalization, adapter rendering, writing, and validation.

## Hooks

V3 hook system had strong enforcement value:

- Policy source records live under `v3_to_be_removed/source/hooks/policies/`.
- Shared runtime helpers live in `v3_to_be_removed/claude/hooks/scripts/_lib.mjs`.
- OpenCode plugin runtime is generated from `v3_to_be_removed/scripts/generate/render/opencode-plugin.mjs`.
- Completion and route gates appear in generated route contract maps and hook scripts.

Lesson: v4 should keep runtime enforcement as first-class architecture.

## Commands and skills

V3 commands were split by platform:

- Codex commands: `v3_to_be_removed/source/commands/codex/`
- Copilot commands: `v3_to_be_removed/source/commands/copilot/`
- OpenCode commands: `v3_to_be_removed/source/commands/opencode/`

V3 skills were shared source bodies with platform rendering:

- Skill metadata: `v3_to_be_removed/source/skills/<skill>/skill.json`
- Skill body: `v3_to_be_removed/source/skills/<skill>/body.md`
- Generated skill targets under Claude, Codex, OpenCode, and Copilot trees.

Lesson: v4 should make command semantics shared first, then adapter-specific.

## Installer

V3 install responsibilities:

- config merge and managed blocks in `v3_to_be_removed/scripts/install/managed-files.mjs`;
- install orchestration in `v3_to_be_removed/scripts/install/cli.mjs`;
- wrapper generation in `v3_to_be_removed/scripts/generate/render/codex-wrapper.mjs`;
- OpenCode install library in `v3_to_be_removed/opencode/src/install.ts`.

Lesson: v4 should have one installer package with surface-specific install plans.

## Validation

V3 validation existed across:

- `v3_to_be_removed/tests/generated-artifacts.test.mjs`
- `v3_to_be_removed/tests/hook-policy-catalog.test.mjs`
- `v3_to_be_removed/codex/tests/`
- `v3_to_be_removed/claude/tests/`
- `v3_to_be_removed/opencode/src/*.test.ts`

Lesson: v4 validation should cover source graph, rendered bundles, runtime guards, installer behavior, and docs.

