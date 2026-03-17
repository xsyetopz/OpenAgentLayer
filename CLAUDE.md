# ClaudeAgents

7 agents, 10 skills, 13 hooks (all 13 lifecycle events). Targets CC v2.1.75+.

## Agents

| Agent       | File          | pro    | max    | enterprise | Purpose                                  |
| ----------- | ------------- | ------ | ------ | ---------- | ---------------------------------------- |
| @athena     | athena.md     | sonnet | opus   | opus       | Design, plan, architect                  |
| @hephaestus | hephaestus.md | sonnet | sonnet | sonnet     | Write code, fix bugs, build features     |
| @nemesis    | nemesis.md    | sonnet | opus   | opus       | Review code, security audit              |
| @atalanta   | atalanta.md   | haiku  | haiku  | haiku      | Run tests, parse failures, root causes   |
| @calliope   | calliope.md   | haiku  | haiku  | haiku      | Write/edit documentation (markdown only) |
| @hermes     | hermes.md     | sonnet | sonnet | sonnet     | Research, explore codebase, cite sources |
| @odysseus   | odysseus.md   | sonnet | opus   | opus       | Multi-step delegation, progress tracking |

**Built-in subagents disabled**: `Explore`, `Plan`, and `general-purpose` are denied via `permissions.deny`. Use `@hermes` (explore), `@athena` (plan), `@odysseus` (general-purpose) instead.

## Skills

Plugin install (`claude plugin install cca`) gives the `cca:` prefix. Manual install (`install.sh`) uses the `cca-` prefix.

| Skill            | Plugin                | Manual                | Status |
| ---------------- | --------------------- | --------------------- | ------ |
| `review-code`    | `/cca:review-code`    | `/cca-review-code`    | Active |
| `desloppify`     | `/cca:desloppify`     | `/cca-desloppify`     | Active |
| `ship`           | `/cca:ship`           | `/cca-ship`           | Active |
| `decide`         | `/cca:decide`         | `/cca-decide`         | Active |
| `audit-security` | `/cca:audit-security` | `/cca-audit-security` | Active |
| `test-patterns`  | `/cca:test-patterns`  | `/cca-test-patterns`  | Active |
| `document`       | `/cca:document`       | `/cca-document`       | Active |
| `optimize`       | `/cca:optimize`       | `/cca-optimize`       | Active |
| `handle-errors`  | `/cca:handle-errors`  | `/cca-handle-errors`  | Active |
| `session-export` | `/cca:session-export` | `/cca-session-export` | Active |

## Team Commands

| Command          | Pipeline                                        |
| ---------------- | ----------------------------------------------- |
| `/team-review`   | @hermes -> @nemesis -> @atalanta                |
| `/team-feature`  | @athena -> @hephaestus -> @nemesis -> @atalanta |
| `/team-debug`    | @hermes -> @hephaestus -> @atalanta             |
| `/team-refactor` | @athena -> @hephaestus -> @nemesis              |
| `/team-ship`     | @nemesis -> @atalanta -> /cca:ship              |

## Hooks

13/13 lifecycle events covered. User-level + project-level.

**User-level** (`~/.claude/hooks/`):

- `pre-secrets.py` - PreToolUse: blocks .env reads/writes, auth-header echoes, force-push to main

**Project-level** (`hooks.json`):

- UserPromptSubmit -> `user-prompt-submit.py` (git context injection)
- SessionStart -> `session-budget.py` (line budget warnings)
- PreToolUse -> `pre-schema.py` + `pre-bash.py` + `pre-post-proxy.py`
- PostToolUse -> LSP prompt + `post-write.py` + `post-bash.py` + `pre-post-proxy.py`
- PostToolUseFailure -> `post-failure.py` (retry loop detection)
- SubagentStop -> scope-reduction prompt + `subagent-scan.py` + collaboration prompt
- TeammateIdle -> `teammate-idle.py` (force continuation)
- Stop -> anti-rationalization prompt + `stop-scan.py`
- SessionEnd -> `session-end.py` (cleanup + audit summary)
- Notification -> `notification.py` (audit logging)
- PermissionRequest -> `permission-request.py` (audit trail)

## Development

```bash
make lint      # shellcheck + ruff + jsonlint
make test      # pytest (65 tests)
make build     # build plugin
make validate  # lint + test + build
```

## File Structure

```text
.claude-plugin/  plugin.json (marketplace manifest)
.github/         workflows/ (ci.yml, release.yml), ISSUE_TEMPLATE/, CONTRIBUTING.md
agents/          7 agent definitions (athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus)
commands/        team-review, team-feature, team-debug, team-refactor, team-ship
skills/          10 skill directories (review-code, desloppify, ship, decide, audit-security, etc.)
hooks/           configs/ (base.json, pro.json, max.json, enterprise.json)
                 user/ (pre-secrets.py, rtk-rewrite.sh)
                 scripts/ (_lib.py, _run.sh, 14 hook scripts)
constraints/     shared.md, pro.md, max.md, enterprise.md, zen.md
templates/       CLAUDE.md, settings-global.json
tests/           pytest tests for all hooks
mcp/             MCP server (cca-harness)
install.sh       Package flags, model substitution, validation
build-plugin.sh  Builds marketplace-ready dist from source
```

@RTK.md
