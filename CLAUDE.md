# ClaudeAgents

7 agents, 11 skills, split-level hooks. Targets CC v2.1.75+.

## Agents

| Agent       | File          | Pro    | Max    | Purpose                                  |
| ----------- | ------------- | ------ | ------ | ---------------------------------------- |
| @athena     | athena.md     | sonnet | opus   | Design, plan, architect                  |
| @hephaestus | hephaestus.md | sonnet | sonnet | Write code, fix bugs, build features     |
| @nemesis    | nemesis.md    | sonnet | sonnet | Review code, security audit              |
| @atalanta   | atalanta.md   | haiku  | haiku  | Run tests, parse failures, root causes   |
| @calliope   | calliope.md   | haiku  | haiku  | Write/edit documentation (markdown only) |
| @hermes     | hermes.md     | sonnet | sonnet | Research, explore codebase, cite sources |
| @odysseus   | odysseus.md   | sonnet | opus   | Multi-step delegation, progress tracking |

**Built-in subagents disabled**: `Explore`, `Plan`, and `general-purpose` are denied via `permissions.deny`. Use `@hermes` (explore), `@athena` (plan), `@odysseus` (general-purpose) instead.

## Skills

| Skill               | Slash Command        | Status |
| ------------------- | -------------------- | ------ |
| `ca-review-code`    | `/ca-review-code`    | Active |
| `ca-desloppify`     | `/ca-desloppify`     | Active |
| `ca-ship`           | `/ca-ship`           | Active |
| `ca-decide`         | `/ca-decide`         | Active |
| `ca-audit-security` | `/ca-audit-security` | Active |
| `ca-test-patterns`  | `/ca-test-patterns`  | Active |
| `ca-document`       | `/ca-document`       | Active |
| `ca-optimize`       | `/ca-optimize`       | Active |
| `ca-handle-errors`  | `/ca-handle-errors`  | Active |
| `ca-session-export` | `/ca-session-export` | Active |
| `ca-commit`         | `/ca-commit`         | Active |

## Hooks

**User-level** (`~/.claude/hooks/`):

- `guard-secrets.py` - PreToolUse: blocks .env reads/writes, auth-header echoes, force-push to main, broad rm -rf

**Project-level** (`.claude/settings.json` -> `hooks.json`):

- SessionStart -> `check-budget.py` - warns when CLAUDE.md/MEMORY.md exceeds line budget
- PreToolUse[Bash] -> `guard-commands.py` - blocks large-output commands + commit quality checks
- PostToolUse[Write|Edit] -> LSP prompt + `validate-write.py` (auto-format + placeholder + comment-slop)
- SubagentStop[agents] -> scope-reduction prompt + `scan-completion.py` + collaboration-protocol prompt
- Stop -> `scan-completion.py` + session-export reminder prompt

## Install

```bash
./install.sh /path/to/project --pro   # sonnet (haiku for atalanta/calliope)
./install.sh /path/to/project --max   # opus for athena/odysseus, sonnet otherwise
./install.sh --global --pro           # ~/.claude/
```

## File Structure

```text
agents/          athena.md, hephaestus.md, nemesis.md, atalanta.md,
                 calliope.md, hermes.md, odysseus.md
skills/          ca-review-code/, ca-desloppify/, ca-ship/,
                 ca-decide/, ca-audit-security/, ca-test-patterns/,
                 ca-document/, ca-optimize/, ca-handle-errors/,
                 ca-session-export/, ca-commit/
hooks/           hooks.json, guard-secrets.py,
                 scripts/_lib.py, scripts/check-budget.py,
                 scripts/guard-commands.py, scripts/validate-write.py,
                 scripts/scan-completion.py
templates/       CLAUDE.md (installed to target projects)
install.sh       Version check, Python check, tier flags, model substitution, migration, validation
```
