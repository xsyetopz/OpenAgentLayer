# Generator/Deployer Acceptance Contract

The OAL reboot is not complete until a single acceptance command proves the product.

## Required command

The repo should expose one command equivalent to:

```bash
bun run accept
```

The exact command name can differ, but there must be one clear full-product acceptance command.

## Acceptance must prove

### 1. Source loading

- authored source loads successfully;
- all source references resolve;
- generated output is not treated as authored source;
- `v3_legacy` is not imported by OAL runtime code.

### 2. Provider rendering

- Codex artifacts render;
- Claude Code artifacts render;
- OpenCode artifacts render;
- generated configs parse;
- generated files have source provenance;
- unsupported provider keys fail validation where applicable.

### 3. Model routing

- Codex model allowlist is enforced;
- Claude model allowlist is enforced;
- forbidden models fail validation;
- effort/default routing policy is validated.

### 4. Hooks

- `.mjs` hooks are generated or copied as executable runtime files;
- hook fixture tests run outside the source tree;
- completion gates reject incomplete route output;
- destructive command guards and secret guards operate on fixture inputs;
- route context behavior is provider-specific.

### 5. Commands/routes

- each route renders to provider-native surfaces;
- route contracts are actionable;
- route owner/permissions/validation are represented;
- no two-line route cards pass as production commands.

### 6. Tools

- OpenCode tools are runnable or deliberately absent;
- if generated, tools are wired into OpenCode config/commands/agents;
- tool metadata alone does not pass.

### 7. Deploy/install

- deploy writes rendered artifacts into fixture roots;
- deploy preserves user-owned config;
- structured merge tracks owned keys;
- deploy writes a manifest;
- uninstall removes only manifest-owned files/blocks/keys;
- repeated deploy/uninstall is safe.

### 8. Generated/source drift

- generated output can be regenerated cleanly;
- hand-edited generated output fails checks unless source is updated;
- generated files identify their source or manifest provenance.

## Stub rejection

Acceptance must fail if the implementation contains only:

- docs;
- schemas;
- placeholder JSON/Markdown catalogs;
- prompt cards;
- fake hooks;
- fake tools;
- representative examples;
- shallow generated configs;
- tests that merely assert files exist.

## Evidence requirement

The final worker response is not trusted. Only the acceptance command and repository diff are trusted.
