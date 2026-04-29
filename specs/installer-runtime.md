# Installer runtime

Purpose: Bun installer and managed runtime contract.

Authority: normative.

## Runtime direction

- Build runtime: Bun.
- Installer runtime: Bun.
- Hook runtime: `.mjs` files that target hook executors can run.
- TypeScript source compiles or runs through Bun.

## Install scopes

- global;
- project.

## Managed files

Every install writes a manifest containing:

- surface;
- scope;
- generated bundle ID;
- target path;
- file list;
- managed block markers;
- timestamp;
- renderer version.

## Install rules

- Create target directories as needed.
- Merge config through marked managed blocks.
- Respect surface-specific config scope and ownership from [surface config contract](surface-config-contract.md).
- Never overwrite unmarked user content.
- Write executable bits for hook scripts where needed.
- Verify installed files parse or execute where possible.

## Uninstall rules

- Read manifest.
- Remove managed files.
- Remove empty managed directories.
- Remove managed config blocks.
- Leave unmarked user files untouched.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
