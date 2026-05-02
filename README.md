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
bun run plugins -- --home "$HOME" --provider all --dry-run
./bump-version.sh --dry-run patch
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

## Provider plugin metadata

OAL keeps provider plugin metadata in this repository and renders provider
payloads from source at sync time. The `plugins/` tree must not duplicate
generated agents, commands, skills, hooks, or tools:

- `.claude-plugin/marketplace.json` points Claude Code at `plugins/claude/openagentlayer`
- `.agents/plugins/marketplace.json` points Codex at `plugins/codex/openagentlayer`
- `plugins/opencode/openagentlayer/package.json` identifies the local OpenCode plugin

For local install testing, use the provider-native commands:

```text
/plugin marketplace add ./OpenAgentLayer
/plugin install openagentlayer@openagentlayer
```

OpenCode loads local plugins from `~/.config/opencode/plugins/` or a project
`.opencode/plugins/` directory; `bun run plugins` writes the user-level choice.

User-level plugin sync renders provider-native payloads into provider homes,
writes the Codex local marketplace entry, populates active plugin caches, and
prunes stale OAL cache versions:

```bash
bun run plugins -- --home "$HOME" --provider all --dry-run
bun run plugins -- --home "$HOME" --provider all
```

## Codex baseline instructions

Codex OAL profiles set `model_instructions_file = "AGENTS.md"` so sessions use
the generated OAL baseline instead of changing server defaults. To inspect what
Codex received, start a Codex thread and check the first line of the newest
`~/.codex/sessions/**/*.jsonl`.

## Version bumps

Use `bump-version.sh` for product releases:

```bash
./bump-version.sh --dry-run patch
./bump-version.sh minor
./bump-version.sh 1.2.3-beta.1
```

The script updates the root product version, source metadata, plugin manifests,
Homebrew cask, Claude marketplace entry, and changelog heading. Workspace
package versions stay internal.

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
