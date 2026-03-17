# Contributing to ClaudeAgents

## Quick Start

```bash
git clone https://github.com/xsyetopz/ClaudeAgents.git
cd ClaudeAgents
make lint    # shellcheck + jsonlint
make test    # node --test
make build   # build plugin
```

## Development Workflow

1. Fork and clone the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes
4. Run `make validate` (lint + test + build)
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

1. Create `agents/your-agent.md` with YAML frontmatter (name, model, color, description, tools, skills, maxTurns, effort)
2. Add constraints, behavioral rules, anti-patterns, and output expectations
3. Add tests if the agent has custom behavior
4. Update the agent matcher in `hooks/configs/base.json` SubagentStop
5. Update CLAUDE.md agent table
6. Run `make validate`

## Adding a Skill

1. Create `skills/your-skill/SKILL.md`
2. Follow existing skill structure (principles, rules, anti-patterns, language-specific patterns)
3. Add token metadata comment: `<!-- tokens: ~N | activation: trigger phrases -->`
4. Update CLAUDE.md skill table
5. Run `make validate`

## Adding a Hook

1. Create `hooks/scripts/your-hook.mjs`
2. Use `_lib.mjs` helpers: `readStdin()`, `deny()`, `allow()`, `warn()`, `passthrough()`, `auditLog()`
3. Add the hook to all config files: `hooks/configs/{base,pro,max,enterprise}.json`
4. Add tests in `tests/test-your-hook.mjs`
5. Run `make validate`

## Code Style

- **JavaScript**: Node.js >= 18 ESM (.mjs), stdlib-only
- **Bash**: shellcheck
- **JSON**: valid JSON (validated in CI)
- **Markdown**: clear structure, no filler adjectives
