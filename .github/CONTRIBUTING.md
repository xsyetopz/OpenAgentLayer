# Contributing to openagentsbtw

Full contributor guide: [`CONTRIBUTING.md`](../CONTRIBUTING.md) in the repo root.

## Quick Start

```bash
git clone https://github.com/xsyetopz/openagentsbtw.git
cd openagentsbtw
bun install --frozen-lockfile
bun run generate
bun test tests claude/tests codex/tests
cd opencode && bun install --frozen-lockfile && bun test && bun run typecheck
node scripts/ci/install-smoke.mjs
./build-plugin.sh
```

## Development Workflow

1. Fork and clone the repo.
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Edit canonical sources in `source/`, not generated files.
4. Run `bun run generate` and `bun run check:generated`.
5. Run tests: `bun test tests claude/tests codex/tests`. Add `cd opencode && bun test && bun run typecheck` if you touched `opencode/`.
6. Commit with [Conventional Commits](https://www.conventionalcommits.org/): `feat(agents): add new constraint to athena`
7. Open a PR using the template.

## Commit Scopes

`agents`, `skills`, `hooks`, `install`, `ci`, `docs`

## Adding Agents, Skills, or Hooks

See the root [`CONTRIBUTING.md`](../CONTRIBUTING.md) for step-by-step instructions on adding each type.

## Code Style

- **JavaScript**: Node.js >= 24.14.1 LTS ESM (`.mjs`), stdlib-only
- **Bash**: Pass shellcheck
- **JSON**: Valid (CI-validated)
- **Markdown**: Clear structure, no filler adjectives
- **Comments**: Non-obvious "why" only
- **CI**: Linux validates generated outputs, tests, OpenCode, and release packaging; Linux and Windows both validate native install/config/uninstall entrypoints
