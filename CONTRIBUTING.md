# Contributing to OpenAgentLayer

This repo moves fast. Keep changes small, current, and verified against real
OAL behavior.

## Read first

Before large changes, read:

- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`
- `docs/02_OAL_REBOOT_PRODUCT_REQUIREMENTS.md`
- `docs/03_OAL_REBOOT_PRODUCT_SPEC.md`
- `docs/05_GENERATOR_DEPLOYER_ACCEPTANCE.md`
- `docs/provider_config_research/08_OAL_RENDER_DEPLOY_MAPPING.md`
- `docs/provider_config_research/09_ACCEPTANCE_TEST_REQUIREMENTS.md`

`reference notes/` is read-only reference material. Do not modify it and do not import
it from runtime code.

## Workflow

1. Fork the repo.
2. Clone your fork.
3. Fetch upstream skill submodules:
   ```bash
   git submodule update --init --recursive
   ```
4. Create a focused branch.
5. Make one coherent change set.
6. Preview generated output when source or renderers change.
7. Run targeted validation.
8. Commit with a message that explains why.
9. Open a pull request with motivation, approach, generated-output evidence, and
   test evidence.

## Ground rules

- Prefer surgical diffs over broad rewrites.
- Keep public docs aligned with current behavior.
- Keep package boundaries clear: one package, one responsibility.
- Do not add placeholders, demo folders, fake schemas, disconnected catalogs, or
  docs-as-implementation.
- Do not hand-edit generated output as the source of truth.
- Keep executable hooks as `.mjs` files with the shebang on the first line.
- Keep provider-specific behavior honest; do not copy assumptions across Claude
  Code, Codex, and OpenCode without checking the supported surface.
- Use OpenAgentLayer or OAL naming in active code, docs, package metadata, CI,
  Homebrew metadata, and generated user-facing artifacts.

## Validation

Pick commands that match touched areas.

### Core repo

```bash
bunx tsc --noEmit
bun run test
bun run accept
bun run biome:check
```

### Generated output and deploy behavior

```bash
bun run check
bun run preview -- --provider all
bun run preview -- --provider codex --path .codex/config.toml --content
bun run deploy -- --target /tmp/oal-check --scope project --provider all --dry-run
bun run plugins -- --home /tmp/oal-home --provider all --dry-run
```

### Release surfaces

```bash
ruby -c homebrew/Casks/openagentlayer.rb
bun run roadmap:evidence
```

### Product naming audit

```bash
grep -R -n -i 'blocked-name-pattern' README.md CONTRIBUTING.md CHANGELOG.md docs homebrew packages source tests package.json .github
```

Replace `blocked-name-pattern` with the blocked names being checked during the
release audit.

## Provider notes

### Codex

- Allowed models: `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.3-codex`.
- `AGENTS.md` is a managed block.
- `.codex/config.toml` feature toggles need concise inline reasons.
- Hooks must stay executable `.mjs`.

### Claude Code

- Allowed models: `claude-opus-4-7`, `claude-opus-4-7[1m]`,
  `claude-sonnet-4-6`, `claude-haiku-4-5`.
- `CLAUDE.md` is a managed block.
- Hooks are command handlers that call executable `.mjs` scripts.

### OpenCode

- `opencode.jsonc` owns native config, agents, commands, tools, plugins,
  instructions, permissions, and model fallbacks.
- Generated tools live under `.opencode/tools`.
- Hooks must stay executable `.mjs`.

## CI/CD

CI runs on pull requests to `master` and pushes to `master`.

The workflow must:

- run typecheck, tests, acceptance, lint, roadmap evidence, and cask syntax
- run render/deploy dry-runs before any submission step
- submit Homebrew updates only from `xsyetopz/OpenAgentLayer` on `master`
- refuse fork deploys at workflow condition and shell guard levels
- avoid `pull_request_target`
- avoid broad write permissions

Homebrew submission uses `HOMEBREW_TAP_REPOSITORY` and `HOMEBREW_TAP_TOKEN`.
Without those values, CI skips submission after required checks pass.

## Pull request checklist

- [ ] Scope is focused.
- [ ] `bunx tsc --noEmit` passes when TypeScript changed.
- [ ] `bun run test` passes when behavior changed.
- [ ] `bun run accept` passes for generator, deployer, provider, hook, or policy
      changes.
- [ ] Generated previews or dry-runs were inspected for source/render changes.
- [ ] Homebrew cask syntax passes for release-surface changes.
- [ ] Reference docs or tests changed with behavior changes.
- [ ] Commit messages explain intent.
- [ ] PR description states what changed and how it was validated.

## Reporting bugs

Include:

- reproduction steps
- expected vs actual behavior
- generated artifact path or provider surface
- relevant source snippet or diagnostic output
- commit hash
- platform details

## Using AI tools

AI assistance is allowed. You own the result.

- read surrounding code first
- verify generated changes
- run real tests
- do not merge code you do not understand

## Code of Conduct

Be direct, respectful, and evidence-based. Keep technical disagreement focused
on code, behavior, tests, and user impact.
