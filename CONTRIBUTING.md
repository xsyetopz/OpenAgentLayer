# Contributing

openagentsbtw generates platform-specific artifacts for four targets from a single canonical source:

| Target         | Directory   | What gets generated                     |
| -------------- | ----------- | --------------------------------------- |
| Claude Code    | `claude/`   | Plugin, hooks, skills, templates, tests |
| Codex CLI      | `codex/`    | Plugin, custom agents, hooks, templates |
| OpenCode       | `opencode/` | Framework integration, templates        |
| GitHub Copilot | `copilot/`  | VS Code assets, hook scripts            |

Canonical source lives in `source/`. Generation is handled by `scripts/generate.mjs`.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24.14.1 LTS
- [Bun](https://bun.sh/)
- Git

## Setup

```bash
git clone https://github.com/xsyetopz/openagentsbtw.git
cd openagentsbtw
bun install --frozen-lockfile
bun run generate
```

If you touch `opencode/`:

```bash
cd opencode && bun install --frozen-lockfile
```

## Workflow

1. Edit the canonical source.
2. Regenerate artifacts: `bun run generate`.
3. Run checks (see [Validation](#validation)).
4. Review the generated diff before committing.

### Canonical Sources

| File                           | Controls                     |
| ------------------------------ | ---------------------------- |
| `source/agents/*/agent.json`   | Agent definitions (7 agents) |
| `source/agents/*/prompt.md`    | Agent prompt templates       |
| `source/skills/*/skill.json`   | Skill metadata               |
| `source/skills/*/body.md`      | Skill content                |
| `source/commands/*/*.json`     | Command definitions          |
| `source/hooks/policies/*.json` | Hook policies                |
| `source/guidance/*.md`         | Shared project guidance      |

### Generated Outputs

Do not hand-edit these unless you are also changing the generator or intentionally patching and then backfilling the source.

- `claude/` (agents, skills, hooks, CLAUDE.md)
- `codex/` (agents, hooks, config)
- `opencode/templates/`
- `copilot/` (agents, skills, prompts, hooks)

## Validation

Root checks:

```bash
bun run generate
bun run check:generated
bun test tests claude/tests codex/tests
node scripts/ci/install-smoke.mjs
```

OpenCode checks (if you touched `opencode/`):

```bash
cd opencode && bun test && bun run typecheck
```

CI runs Linux validation for generated outputs, tests, and release packaging. Both Linux and Windows validate native install/config/uninstall entrypoints.

## Adding an Agent

1. Add `agent.json` and `prompt.md` under `source/agents/<name>/`.
2. Adjust platform overlays only when a system needs different wording or constraints.
3. Run `bun run generate`.
4. Add or update tests if the generated behavior changes.
5. Update docs if the agent affects public guidance.

## Adding a Skill

1. Add `skill.json` and `body.md` under `source/skills/<name>/`.
2. Add any references under `source/skills/<name>/reference/`.
3. Run `bun run generate`.

## Adding a Command

1. Add the entry in the relevant platform catalog under `source/commands/`.
2. Keep the command single-purpose. Do not overload it with unrelated flow.
3. Prefer explicit modifiers over special-case mode names when the behavior is orthogonal.
4. Run `bun run generate`.

## Adding a Hook

1. Add or update the policy file under `source/hooks/policies/`.
2. Update the renderer in `scripts/generate.mjs` only if the policy model needs a new surface.
3. Regenerate and confirm the platform hook manifests changed as expected.
4. Add tests for the new behavior.

## Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(agents): add pre-planning checklist to athena
fix(hooks): handle edge case in bash-guard regex
docs: update README with architecture diagram
test: add hook unit tests for post-write
chore(ci): add shellcheck to CI pipeline
```

Scopes: `agents`, `skills`, `hooks`, `install`, `ci`, `docs`

## Pull Requests

Use the PR template at `.github/PULL_REQUEST_TEMPLATE.md`. It covers:

- Summary (1-3 bullet points)
- Component checklist (which part of the system)
- Testing checklist (which checks you ran)
- Quality checklist (no placeholders, no secrets, artifacts refreshed, docs updated)

## Reporting Issues

Open an issue at [github.com/xsyetopz/openagentsbtw/issues](https://github.com/xsyetopz/openagentsbtw/issues). Include:

- What you did
- What happened
- What you expected
- Platform (Claude/Codex/OpenCode/Copilot) and OS

## Code Style

- **JavaScript**: Node.js ESM (`.mjs`), stdlib-only, no external dependencies beyond devDependencies
- **Bash**: Pass [shellcheck](https://www.shellcheck.net/)
- **JSON**: Valid, validated in CI
- **Markdown**: Clear structure, no filler adjectives, no hype copy
- **Contrastive examples**: Use one `diff` fence for before/after, bad/good, vulnerable/fixed, or invalid/valid examples. Do not split them across two code blocks.
- **Comments**: Non-obvious "why" only. No narrating comments ("Get the user", "Increment counter").
- **Naming**: Descriptive nouns for variables, `is_`/`has_`/`can_` for booleans, verb phrases for functions. Avoid: `data`, `result`, `temp`, `info`, `handle`, `process`, `manager`, `helper`, `util`.
- **Functions**: Max 3 parameters, max 30 lines. One reason to change (SRP).

## Contribution Rules

- Do not hand-edit generated files without also updating the source or generator.
- Keep platform differences honest. Shared policy is centralized; emitted artifacts may differ when the underlying CLIs expose different surfaces.
- When changing Codex behavior, update `codex/` and `docs/platforms/codex.md`.
- When changing OpenCode behavior, update `opencode/` and `docs/platforms/opencode.md`.
- When changing Copilot behavior, update `copilot/` and relevant `.github/` assets.
- If you change hook behavior, check both the shared policy source and the generated hook mappings.
- If you change contributor-facing workflow, keep `.github/`, this file, and `AGENTS.md` aligned.
- Preserve the split architecture. Platform assets stay isolated by directory.

## For AI Agents

See `AGENTS.md` for operating instructions. Key rules:

- Treat `source/` as canonical unless the task is explicitly platform-local.
- Prefer generated fixes over manual drift. If you change generated outputs directly, bring the generator or source back into sync in the same task.
- Do not copy platform-specific assumptions across targets without checking the actual supported surface.
- Read local context before changing code. Use `rg` for search.
- Do not leave placeholders, deferred core work, or fake compatibility notes unless the user explicitly narrows scope.

### Minimum Close-Out

Before finishing a substantial change:

1. Regenerate artifacts if source changed.
2. Run the smallest relevant verification set.
3. Report what changed, what was verified, and what remains unverified.
