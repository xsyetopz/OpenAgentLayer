# OAL Provider-Surface Acceptance Test Requirements

The acceptance suite must prove product behavior, not scaffolding.

## Required command

The repo should expose one command that proves OAL works end-to-end, for example:

```bash
bun run accept
```

Exact name can differ, but it must be a single visible command in `package.json`.

## Required checks

The acceptance command must verify:

1. Source loading
   - loads all authored source records;
   - rejects missing references;
   - rejects unsupported model names;
   - rejects v3 legacy imports;
   - maps generated artifacts back to source records.

2. Codex rendering
   - generated TOML parses;
   - config uses only allowed Codex models;
   - deprecated `on-failure` and `guardian_subagent` are not emitted;
   - hooks are command `.mjs` hooks unless installed support proves otherwise;
   - agent roles are not shallow placeholders.

3. Claude rendering
   - settings JSON parses;
   - only allowed Claude models are emitted;
   - hooks are executable `.mjs` commands;
   - subagents/skills/commands are generated where intended.

4. OpenCode rendering
   - config JSON/JSONC parses;
   - `permission` is used for tool control;
   - custom tools exist as `.ts`/`.js` files when referenced;
   - plugin files are executable/importable;
   - commands and agents are provider-native.

5. Deploy/uninstall
   - deploy into fixture roots for Codex/Claude/OpenCode;
   - manifest is written;
   - structured merge preserves user-owned config;
   - uninstall removes only manifest-owned files/blocks/keys;
   - executable `.mjs` mode is preserved.

6. Runtime hooks
   - every hook has allowed/blocking/malformed fixtures;
   - hooks run from installed fixture path, not source repo path;
   - provider-specific outputs are valid.

7. Generated/source drift
   - generated outputs match renderer results;
   - hand-edited generated output fails check.

## Stub rejection

Acceptance must fail on:

- agent role cards with only purpose/triggers/workflow.
- command cards with only description/output.
- hook descriptions with no executable `.mjs` script.
- OpenCode tool references without tool files.
- plugin entries without plugin payload.
- provider config with unsupported models.
- any `openagentsbtw`/`oabtw` naming in new OAL product output.

## Why this matters

Without an acceptance command, a worker can satisfy the task by emitting files that look like product. The acceptance command forces the product to run.
