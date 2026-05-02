# OpenAgentLayer

OpenAgentLayer (OAL) generates and deploys provider-native agent layers for
Claude Code, Codex, and OpenCode.

OAL keeps authored source in `source/`, renders disposable provider artifacts,
deploys them with manifest ownership, and uninstalls only OAL-owned material.

## Setup

```bash
git clone https://github.com/xsyetopz/OpenAgentLayer.git
cd OpenAgentLayer
git submodule update --init --recursive
bun install --frozen-lockfile
bun run check
```

## CLI

```bash
bun run check
bun run preview -- --provider all
bun run render -- --provider codex --out generated
bun run deploy -- --target /path/to/project --scope project --provider codex
bun run uninstall -- --target /path/to/project --scope project --provider codex
bun run accept
```

Useful inspection:

```bash
bun packages/cli/src/main.ts preview --provider codex --path .codex/config.toml --content
```

## Packages

- `source` loads authored OAL records.
- `policy` validates source, model allowlists, depth, and generated boundaries.
- `adapter` renders Claude Code, Codex, and OpenCode artifacts.
- `artifact` owns artifact hashing, provenance, and writes.
- `manifest` records OAL ownership.
- `deploy` plans, applies, merges, backs up, and uninstalls.
- `runtime` owns executable `.mjs` hooks.
- `accept` runs product acceptance.
- `cli` exposes user commands.
- `toolchain` prints machine setup plans.

## Homebrew

The tap cask is in `homebrew/Casks/openagentlayer.rb`.
The release repository is `https://github.com/xsyetopz/OpenAgentLayer` on
the `master` branch.

It expects release archives named:

```text
openagentlayer-<version>-macos-universal.tar.gz
```

The archive must contain `bin/oal`.

## Validation

```bash
rtk ruby -c homebrew/Casks/openagentlayer.rb
rtk bunx tsc --noEmit
rtk bun run test
rtk bunx biome check . --error-on-warnings --max-diagnostics 16384
rtk bun run accept
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and validation guidance.

All contributors must follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Star History

<a href="https://www.star-history.com/?repos=xsyetopz%2FOpenAgentLayer&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=xsyetopz/OpenAgentLayer&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=xsyetopz/OpenAgentLayer&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=xsyetopz/OpenAgentLayer&type=date&legend=top-left" />
 </picture>
</a>

## License

[MIT](LICENSE)
