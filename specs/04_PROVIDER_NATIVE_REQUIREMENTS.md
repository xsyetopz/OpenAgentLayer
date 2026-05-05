# Provider-Native Requirements

OAL should be tooling-agnostic at the source intent layer and provider-native at the output layer.

## Codex

Reference baseline behavior Codex surfaces:

- `AGENTS.md`
- custom agent TOML with `developer_instructions`
- plugin skills
- managed profiles in `config.toml`
- hooks
- wrappers/routes

OAL Codex requirements:

- render complete agent TOML, not shallow role cards.
- render complete config/profile fragments with allowed models only.
- render AGENTS.md/global instructions from OAL source.
- render plugin skills with support files/metadata where needed.
- wire hooks through documented Codex hook surfaces only.
- support route contracts such as readonly, edit-required, execution-required.
- validate model allowlist: `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.3-codex` only.
- reject blocked Codex models, and any unapproved model.
- avoid default `xhigh` unless explicitly justified by route/model plan.

## Claude Code

Reference baseline behavior Claude surfaces:

- `.claude/settings.json` / settings templates
- agents/subagents
- skills
- `CLAUDE.md`
- hooks
- route contracts
- plugin/cache behavior

OAL Claude requirements:

- render real agents/subagents with detailed operating contracts.
- render skills and support files.
- render settings fragments while preserving user-owned settings.
- render `CLAUDE.md`/instructions.
- package executable `.mjs` hooks.
- validate allowed models: `claude-opus-4-6`, `claude-opus-4-6[1m]`, `claude-sonnet-4-6`, `claude-haiku-4-5`.
- reject blocked Claude model family variants.
- avoid 1m unless a route explicitly needs large context.

## OpenCode

Reference baseline behavior OpenCode surfaces:

- role prompts under `opencode/templates/agents/`
- generated skills
- commands under `opencode/src/commands.ts`
- plugin guardrails under `opencode/templates/plugins/deprecated product wording.ts`
- instructions
- native continuation concepts such as `--continue`, `/sessions`, `/compact`, and `task_id`

OAL OpenCode requirements:

- render `opencode.json`/`opencode.jsonc` using OpenCode-native config shape.
- render agents, commands, permissions, instructions, tools, and plugin/hook surfaces where supported.
- preserve OpenCode’s own continuation and agent semantics.
- do not clone Claude or Codex behavior blindly.
- ensure generated tools are runnable integrations, not metadata labels.
- ensure generated commands have actionable execution contracts, not two-line descriptors.

## Provider-difference rule

OAL must explicitly represent provider differences.

Example from baseline behavior: Claude had `SubagentStart`, OpenCode mapped route context to plugin `tool.execute.before`, and Codex lacked a Claude-style `SubagentStart` event. OAL should preserve this style of explicit capability mapping.

## External surface references

Codex config should be checked against the current Codex config schema and provider docs. Claude settings should respect Claude Code settings scopes and the settings schema. OpenCode config should respect JSON/JSONC merged config locations and OpenCode’s schema.
