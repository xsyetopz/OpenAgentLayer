# Install OAL

OAL is a Bun-based CLI that renders provider-native artifacts for Codex, Claude
Code, and OpenCode.

## Source Checkout

Use this path when developing OAL or testing unreleased behavior:

```bash
git clone https://github.com/xsyetopz/OpenAgentLayer.git
cd OpenAgentLayer
git submodule update --init --recursive
bun install --frozen-lockfile
bun run check
```

`bun run check` loads authored source, validates product policy, and proves that
provider artifacts can render.

## Convenience Install

Use the repository scripts when you want OAL to handle the local install flow:

```bash
./install.sh setup --scope global --provider all --toolchain --dry-run
./install-online.sh setup --scope global --provider all --toolchain --dry-run
```

`install-online.sh` clones OAL into a temporary directory, installs into
`OAL_INSTALL_DIR` or `$HOME/.local/share/openagentlayer`, runs `install.sh`, and
cleans up the temporary clone.

## Toolchain Setup

Preview the toolchain plan before applying it:

```bash
bun run toolchain -- --os macos --optional ctx7,anthropic-docs,opencode-docs
bun run setup -- --scope global --provider all --toolchain --dry-run
```

Homebrew does not provide the OAL Bun install path. OAL setup uses the Bun
installer from `bun.sh`.

## Binary Shim

Install the source-checkout `oal` shim after the checkout works:

```bash
bun packages/cli/src/main.ts bin --dry-run
bun packages/cli/src/main.ts bin
oal check
```
