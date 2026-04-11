# Contributing to openagentsbtw

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

1. Fork and clone the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes
4. Run `bun run generate`, `bun run check:generated`, `bun test tests claude/tests codex/tests`, `node scripts/ci/install-smoke.mjs`, and `cd opencode && bun test && bun run typecheck` if you touched `opencode/`
5. Commit with conventional format: `feat(agents): add new constraint to athena`
6. Open a PR

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(agents): add pre-planning checklist to athena
fix(hooks): handle edge case in bash-guard regex
docs: update README with architecture diagram
test: add hook unit tests for post-write
chore(ci): add shellcheck to CI pipeline
```

Scopes: `agents`, `skills`, `hooks`, `install`, `ci`, `docs`

## Adding an Agent

1. Update the canonical source in `source/agents.json` and `source/agent-prompts.mjs`
2. Adjust platform overlays only when a system needs different wording or constraints
3. Run `bun run generate` to emit Claude, Codex, OpenCode, and Copilot artifacts
4. Add or update tests if the generated behavior changes
5. Update docs if the new agent affects public guidance

## Adding a Skill

1. Add the canonical skill entry in `source/skills.json`
2. Add the shared body in `source/skills/<name>/body.md`
3. Add any shared references under `source/skills/<name>/reference/`
4. Run `bun run generate` to emit Claude, Codex, and OpenCode skill assets

## Adding a Hook

1. Add or update the shared policy in `source/hook-policies.json`
2. Update the relevant generated script or renderer in `scripts/generate.mjs` only if the shared policy model needs a new surface
3. Regenerate artifacts and confirm the platform hook manifests changed as expected
4. Add tests for the new generated behavior

## Code Style

- **JavaScript**: Node.js >= 24.14.1 LTS ESM (.mjs), stdlib-only
- **Bash**: shellcheck
- **JSON**: valid JSON (validated in CI)
- **Markdown**: clear structure, no filler adjectives
- **CI reality**: Linux validates generated outputs, tests, OpenCode, and release packaging; Linux and Windows both validate native install/config/uninstall entrypoints
