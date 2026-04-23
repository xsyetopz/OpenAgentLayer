# openagentsbtw

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Cross-platform agent scaffolding for Claude Code, Codex CLI, OpenCode, GitHub Copilot, and detected IDE agent surfaces.

One canonical source tree. Generated platform artifacts. Tight prompts, strict routing, and fewer chances for models to drift into garbage architecture or generic AI UI.

## Architecture

Canonical authored source lives under `source/`:

- `source/agents/<agent>/` -- agent metadata and prompt
- `source/skills/<skill>/` -- skill metadata and body
- `source/skills/<skill>/` -- skill bodies, references, scripts
- `source/commands/{codex,copilot,opencode}/` -- command catalogs per surface
- `source/catalog/loaders.mjs` -- canonical catalog loader
- `scripts/generate.mjs` -- thin generation entrypoint

Generated targets:

- `claude/`
- `codex/`
- `opencode/`
- `copilot/`

More detail: [docs/architecture.md](docs/architecture.md)

## Install

```bash
git clone https://github.com/xsyetopz/openagentsbtw.git
cd openagentsbtw
./install.sh --all
```

Common presets:

```bash
./install.sh --codex --codex-plan pro-5
./install.sh --claude --claude-plan max-5
./install.sh --copilot --copilot-plan pro
./install.sh --all --caveman-mode full
./install.sh --all --no-optional-ides
./install.sh --optional-ides
```

## Codex Surface

Main verbs:

```bash
oabtw-codex explore "<target>"
oabtw-codex plan "<goal>"
oabtw-codex implement "<task>"
oabtw-codex review "<scope>"
oabtw-codex validate "<scope>"
oabtw-codex document "<task>"
oabtw-codex deslop "<target>"
oabtw-codex design-polish "<ui task>"
oabtw-codex orchestrate "<task>"
oabtw-codex resume --last
oabtw-codex queue add "follow up after the current task"
```

Modifiers:

```bash
oabtw-codex explore --source deepwiki "<github repo task>"
oabtw-codex implement --approval auto "<task>"
oabtw-codex review --speed fast "<scope>"
oabtw-codex validate --runtime long "<suite>"
```

More detail: [docs/platforms/codex.md](docs/platforms/codex.md)


## Development

```bash
bun install --frozen-lockfile
bun run generate
bun test tests claude/tests codex/tests
cd opencode && bun install --frozen-lockfile && bun test && bun run typecheck
```

## Attribution

- Caveman mode draws from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman).
- `design-polish` incorporates ideas from [cyxzdev/Uncodixfy](https://github.com/cyxzdev/Uncodixfy), [anthropics/skills frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), and [pbakaus/impeccable](https://github.com/pbakaus/impeccable).
- `taste*` skills vendor exact upstream `SKILL.md` content from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) at the pinned submodule commit, wrapped with local openagentsbtw names and routing metadata.

## License

[MIT](LICENSE)
