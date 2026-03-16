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

| Skill            | Slash Command       | Status |
| ---------------- | ------------------- | ------ |
| `review-code`    | `/ca:review-code`   | Active |
| `desloppify`     | `/ca:desloppify`    | Active |
| `ship`           | `/ca:ship`          | Active |
| `decide`         | `/ca:decide`        | Active |
| `audit-security` | `/ca:audit-security`| Active |
| `test-patterns`  | `/ca:test-patterns` | Active |
| `document`       | `/ca:document`      | Active |
| `optimize`       | `/ca:optimize`      | Active |
| `handle-errors`  | `/ca:handle-errors` | Active |
| `session-export` | `/ca:session-export`| Active |
| `commit`         | `/ca:commit`        | Active |

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
# Plugin (marketplace)
claude plugin install ca

# Manual (to a project)
./install.sh /path/to/project --pro   # sonnet (haiku for atalanta/calliope)
./install.sh /path/to/project --max   # opus for athena/odysseus, sonnet otherwise
./install.sh --global --pro           # ~/.claude/
```

## File Structure

```text
.claude-plugin/  plugin.json (marketplace manifest)
agents/          athena.md, hephaestus.md, nemesis.md, atalanta.md,
                 calliope.md, hermes.md, odysseus.md
skills/          review-code/, desloppify/, ship/,
                 decide/, audit-security/, test-patterns/,
                 document/, optimize/, handle-errors/,
                 session-export/, commit/
hooks/           hooks.json, guard-secrets.py,
                 scripts/_lib.py, scripts/check-budget.py,
                 scripts/guard-commands.py, scripts/validate-write.py,
                 scripts/scan-completion.py
templates/       CLAUDE.md, shared-constraints.md
build-plugin.sh  Builds marketplace-ready dist from source
install.sh       Version check, Python check, tier flags, model substitution, migration, validation
```
