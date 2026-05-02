# Instructions for Codex/Claude/OpenCode Workers Building OAL

This is not a prompt-card task. This is product construction.

## Worker objective

Build OAL as a running generator/deployer product. Do not satisfy the task by creating representational files. A file that looks like an artifact is not enough. It must be consumed, rendered, deployed, uninstalled, executed, or validated by product behavior.

## v3 rule

`v3_legacy/` is reference and study material only. Do not modify v3 except to move existing reference material into that directory if the repository layout requires it. Do not import v3 into OAL runtime code. Do not mention “oabtw v4” in OAL product code.

## No shortcut rule

Invalid outputs:

- toy configs;
- stub agent TOML;
- two-line commands;
- hook policy files without executable hook behavior;
- tool names without runnable tool code;
- generated artifacts not produced by generator;
- docs as implementation;
- schema-only work;
- placeholder catalogs;
- tests that only assert files exist.

## Required product path

For every feature added, prove the chain:

1. Authored source exists or product code defines behavior.
2. Loader can consume it.
3. Validator can reject invalid variants.
4. Renderer emits provider-native output.
5. Deploy plan knows where it goes.
6. Manifest records ownership.
7. Uninstall removes or reverts only owned material.
8. Test/fixture proves product behavior.

If any link is missing, the work is incomplete.

## Product work categories

Acceptable primary work:

- source loader;
- source validator;
- Codex renderer;
- Claude renderer;
- OpenCode renderer;
- deploy planner;
- install/apply code;
- uninstall code;
- manifest ownership;
- structured config merge;
- runtime `.mjs` hooks;
- hook fixtures;
- OpenCode tool implementation;
- command/route renderer;
- model routing enforcement;
- generated/source drift check;
- v3 isolation check;
- product acceptance command.

Content assets are acceptable only when they complete a product path. Do not make content the main work unless the render/deploy path is already working.

## Product acceptance command

The repo should eventually have one command that proves full product behavior. It may be named according to project conventions, but it should prove at least:

- source loads;
- source validates;
- Codex artifacts render and parse;
- Claude artifacts render and parse;
- OpenCode artifacts render and parse;
- deploy into fixture root works;
- manifest ownership is written;
- uninstall removes only OAL-owned material;
- `.mjs` hook fixtures run;
- generated/source drift is detected;
- model allowlist is enforced;
- v3_legacy is not imported by OAL runtime code.

Do not stop because one file or one provider works. Stop only when product behavior works or a concrete blocker prevents completion.
