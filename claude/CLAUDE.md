# openagentsbtw Claude

7 agents, 19 skills, 10 hooks, custom output style + statusline. Targets CC v2.1.76+.

## Agents

| Agent       | File          | Model      | Context | maxTurns | Purpose                                  |
| ----------- | ------------- | ---------- | ------- | -------- | ---------------------------------------- |
| @odysseus   | odysseus.md   | `opusplan` | 1M      | 100      | Multi-step delegation, progress tracking |
| @athena     | athena.md     | `opus`     | 1M      | 50       | Design, plan, architect                  |
| @hephaestus | hephaestus.md | `sonnet`   | 200K    | 100      | Write code, fix bugs, build features     |
| @nemesis    | nemesis.md    | `sonnet`   | 200K    | 50       | Review code, security audit              |
| @hermes     | hermes.md     | `sonnet`   | 200K    | 50       | Research, explore codebase, cite sources |
| @atalanta   | atalanta.md   | `haiku`    | 200K    | 30       | Run tests, parse failures, root causes   |
| @calliope   | calliope.md   | `haiku`    | 200K    | 30       | Write/edit documentation (markdown only) |

**Built-in subagents disabled**: `Explore`, `Plan`, and `general-purpose` are denied via `permissions.deny`. Use `@hermes` (explore), `@athena` (plan), `@odysseus` (general-purpose) instead.

## Skills

Install via plugin: `claude plugin install openagentsbtw@openagentsbtw`. Bootstrap script handles marketplace registration and user-level extras. `oabtw` is only a documentation shorthand; the Claude plugin ID stays canonical.

## Updating

Use this when you want new features or removed plugin assets:

```bash
git pull
./install.sh --claude
```

If you use a specific plan, repeat it:

```bash
./install.sh --claude --claude-plan max-20
```

Optional browser automation (Playwright CLI):

```bash
./install.sh --playwright-cli
```

Important:

- The supported update path in this repo is reinstall-from-repo.
- That refreshes plugin files, hooks, generated assets, and managed user-level setup.
- Even if Claude refreshes plugin state on its own, users should still rerun `install.sh` after pulling changes here.

| Skill           | Command              | Status |
| --------------- | -------------------- | ------ |
| `review`        | `/cca:review`        | Active |
| `deslop`        | `/cca:deslop`        | Active |
| `git-workflow`  | `/cca:git-workflow`  | Active |
| `decide`        | `/cca:decide`        | Active |
| `explore`       | `/cca:explore`       | Active |
| `trace`         | `/cca:trace`         | Active |
| `debug`         | `/cca:debug`         | Active |
| `security`      | `/cca:security`      | Active |
| `test`          | `/cca:test`          | Active |
| `document`      | `/cca:document`      | Active |
| `design-polish` | `/cca:design-polish` | Active |
| `perf`          | `/cca:perf`          | Active |
| `errors`        | `/cca:errors`        | Active |
| `handoff`       | `/cca:handoff`       | Active |
| `style`         | `/cca:style`         | Active |

## Hooks

Lifecycle-organized in `hooks/scripts/{pre,post,session}/`.

**User-level** (`~/.claude/hooks/`):

- `pre-secrets.mjs` -- guards .env, credentials, force-push

**Project-level** (`hooks.json` -> `hooks/scripts/`):

- `pre/validate-input.mjs` -- schema validation for tool inputs
- `pre/bash-guard.mjs` -- guards dangerous bash commands
- `post/write-quality.mjs` -- auto-format + placeholder + slop scan
- `post/bash-redact.mjs` -- redacts secrets from output
- `post/failure-circuit.mjs` -- retry loop detection
- `session/subagent-route-context.mjs` -- injects subagent route contracts
- `post/subagent-scan.mjs` -- route-aware completion validation on subagent stop
- `post/stop-scan.mjs` -- route-aware completion validation on session stop
- `session/start-budget.mjs` -- line budget warnings
- `session/stream-context.mjs` -- streaming safety context injection
- `session/prompt-git-context.mjs` -- git context injection
- `pre/stream-guard.mjs` -- blocks secret-exposing commands during livestreams

## Model Strategy

Three plans, set at install time via `./install.sh --claude-plan <pro|max-5|max-20>`:

| Role                       | Pro                 | Max 5x              | Max 20x             |
| -------------------------- | ------------------- | ------------------- | ------------------- |
| Orchestrator (`CCA_MODEL`) | `claude-sonnet-4-6` | `opusplan`          | `opus[1m]`          |
| Opus slot                  | `claude-sonnet-4-6` | `claude-opus-4-6`   | `claude-opus-4-6`   |
| Sonnet slot                | `claude-sonnet-4-6` | `claude-sonnet-4-6` | `claude-sonnet-4-6` |
| Haiku slot                 | `claude-haiku-4-5`  | `claude-haiku-4-5`  | `claude-sonnet-4-6` |

Agent models use logical names (`opus`, `sonnet`, `haiku`) that resolve via env vars. Sonnet/haiku agents have 200K context windows and capped maxTurns -- keep delegated payloads focused. Env vars pin model versions in `~/.claude/settings.json`. Output style: CCA. Statusline: model, context %, cost, git branch.

Claude continuity should stay native: resume the session and rely on transcript persistence plus `.claude/memory/MEMORY.md`. `/cca:handoff` is for explicit export or cross-tool transfer, not the default continuity path.

Deferred queue: `/queue <message>` or `queue: <message>` stores a follow-up outside the repo without letting it interrupt the active task. `/queue --auto <message>` dispatches one queued item after the active turn passes stop checks.

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
skills/          22 skill directories (review, explore, trace, debug, caveman, git-workflow, design-polish, test, etc.)
hooks/           configs/ (base.json)
                 user/ (pre-secrets.mjs, rtk-rewrite.sh)
                 scripts/ (_lib.mjs, pre/, post/, session/)
constraints/     shared.md, max.md, zen.md
templates/       CLAUDE.md, settings-global.json
output-styles/   cca.md (custom output style)
statusline/      statusline-command.sh (context/cost/git statusline)
tests/           node:test tests for all hooks
install.sh       Bash wrapper over the shared installer CLI
install.ps1      PowerShell wrapper over the shared installer CLI
build-plugin.sh  Bash wrapper that builds marketplace-ready dist from source
build-plugin.ps1 PowerShell wrapper for the same dist build flow
```
