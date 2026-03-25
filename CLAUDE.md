# ClaudeAgents

7 agents, 11 skills, 10 hooks, custom output style + statusline. Targets CC v2.1.76+.

## Agents

| Agent       | File          | Model      | Purpose                                  |
| ----------- | ------------- | ---------- | ---------------------------------------- |
| @athena     | athena.md     | `opus[1m]` | Design, plan, architect                  |
| @hephaestus | hephaestus.md | `opus[1m]` | Write code, fix bugs, build features     |
| @nemesis    | nemesis.md    | `opus[1m]` | Review code, security audit              |
| @atalanta   | atalanta.md   | `opus[1m]` | Run tests, parse failures, root causes   |
| @calliope   | calliope.md   | `opus[1m]` | Write/edit documentation (markdown only) |
| @hermes     | hermes.md     | `opus[1m]` | Research, explore codebase, cite sources |
| @odysseus   | odysseus.md   | `opusplan` | Multi-step delegation, progress tracking |

**Built-in subagents disabled**: `Explore`, `Plan`, and `general-purpose` are denied via `permissions.deny`. Use `@hermes` (explore), `@athena` (plan), `@odysseus` (general-purpose) instead.

## Skills

Install via plugin: `claude plugin install cca@claude-agents`. Bootstrap script handles marketplace registration and user-level extras.

| Skill        | Command           | Status |
| ------------ | ----------------- | ------ |
| `review`     | `/cca:review`     | Active |
| `desloppify` | `/cca:desloppify` | Active |
| `ship`       | `/cca:ship`       | Active |
| `decide`     | `/cca:decide`     | Active |
| `security`   | `/cca:security`   | Active |
| `test`       | `/cca:test`       | Active |
| `docs`       | `/cca:docs`       | Active |
| `perf`       | `/cca:perf`       | Active |
| `errors`     | `/cca:errors`     | Active |
| `handoff`    | `/cca:handoff`    | Active |
| `style`      | `/cca:style`      | Active |

## Hooks

Lifecycle-organized in `hooks/scripts/{pre,post,session}/`.

**User-level** (`~/.claude/hooks/`):

- `pre-secrets.mjs` — guards .env, credentials, force-push

**Project-level** (`hooks.json` → `hooks/scripts/`):

- `pre/validate-input.mjs` — schema validation for tool inputs
- `pre/bash-guard.mjs` — guards dangerous bash commands
- `post/write-quality.mjs` — auto-format + placeholder + slop scan
- `post/bash-redact.mjs` — redacts secrets from output
- `post/failure-circuit.mjs` — retry loop detection
- `post/subagent-scan.mjs` — placeholder scan on subagent stop
- `post/stop-scan.mjs` — placeholder scan on session stop
- `session/start-budget.mjs` — line budget warnings
- `session/stream-context.mjs` — streaming safety context injection
- `session/prompt-git-context.mjs` — git context injection
- `pre/stream-guard.mjs` — blocks secret-exposing commands during livestreams

## Model Strategy

Two tiers, set at install time via `./install.sh --tier <5x|20x>`:

| Role                       | 5X (default)        | 20X                   |
| -------------------------- | ------------------- | --------------------- |
| Orchestrator (`CCA_MODEL`) | `opusplan`          | `opus[1m]`            |
| Sonnet slot                | `claude-sonnet-4-6` | `claude-opus-4-6[1m]` |
| Haiku slot                 | `claude-haiku-4-5`  | `claude-sonnet-4-6`   |
| All subagents              | `opus[1m]`          | `opus[1m]`            |

Env vars pin model versions in `~/.claude/settings.json`. Output style: CCA. Statusline: model, context %, cost, git branch.

## Development

```bash
make lint      # shellcheck + jsonlint
make test      # node --test
make build     # build plugin
make validate  # lint + test + build
```

## File Structure

```text
.claude-plugin/  plugin.json (marketplace manifest)
.github/         workflows/ (ci.yml, release.yml), ISSUE_TEMPLATE/, CONTRIBUTING.md
agents/          7 agent definitions (athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus)
skills/          11 skill directories (review, desloppify, ship, test, etc.)
hooks/           configs/ (base.json)
                 user/ (pre-secrets.mjs, rtk-rewrite.sh)
                 scripts/ (_lib.mjs, pre/, post/, session/)
constraints/     shared.md, max.md, zen.md
templates/       CLAUDE.md, settings-global.json
output-styles/   cca.md (custom output style)
statusline/      statusline-command.sh (context/cost/git statusline)
tests/           node:test tests for all hooks
install.sh       Bootstrap: marketplace registration, user-level extras, plugin install
build-plugin.sh  Builds marketplace-ready dist from source
```

@RTK.md
