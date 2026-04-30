# Installer runtime

Purpose: Bun installer and managed runtime contract.

Authority: normative.

## Runtime direction

- Build runtime: Bun.
- Installer runtime: Bun.
- Hook runtime: `.mjs` files that target hook executors can run.
- TypeScript source compiles or runs through Bun.
- Generated hook scripts are self-contained and must not import repo-relative TypeScript after render.
- Runtime scripts communicate through normalized JSON on stdin/stdout.

## Install scopes

- global;
- project.

Project scope defaults to the selected project root. Global scope requires an explicit target directory until provider-home writes are implemented.

## Managed files target contract

The complete managed-install contract tracks:

- surface;
- scope;
- generated bundle ID;
- target path;
- file list;
- managed block markers;
- timestamp;
- renderer version.

Current v4 implementation writes a deterministic manifest at:

- `.oal/manifest/<surface>-<scope>.json`

Current v4 manifest fields:

- `surface`
- `scope`
- `targetRoot`
- `generatedAt`
- `entries[]`

Each entry contains:

- relative `path`
- `sha256`
- artifact kind
- source record ids

## Install rules

- Create target directories as needed.
- Write only generated artifacts for the selected surface.
- Preflight every selected surface before writing files.
- `--surface all` must not write an earlier surface when a later surface has a config conflict or other predictable prepare-time install error.
- Merge config through marked managed blocks once config-merge support exists.
- Respect surface-specific config scope and ownership from [surface config contract](surface-config-contract.md).
- Never overwrite unmarked user content.
- Write executable bits for hook scripts where needed.
- Verify installed files parse or execute where possible.

Current install writes generated-only artifacts as full files, text instructions as marked managed blocks, and JSON/TOML configs as manifest-owned structured keys. Install verification checks manifest presence, target-root path safety, managed file existence, managed file hashes or owned values, marked block integrity, and generated hook script execution.

Installer package internals are split by responsibility. The public API remains exported from `@openagentlayer/install`; internal modules own paths, manifest IO, structured config, merge behavior, install planning, uninstall, and verification separately.

## Uninstall rules

- Read manifest.
- Remove managed files.
- Remove empty managed directories.
- Remove managed config blocks.
- Leave unmarked user files untouched.

Current uninstall removes full-file generated artifacts, removes OAL marked text blocks, and removes only manifest-owned structured config keys when the installed value is unchanged. If a managed block or config value was edited after install, uninstall preserves it and reports managed content change.

When uninstall reports unresolved managed content changes, it must keep a manifest with unresolved entries so ownership and later cleanup remain possible. CLI uninstall must return non-zero when uninstall issues are reported.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
