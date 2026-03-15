# ClaudeAgents

Agent definitions, skills, and hooks for Claude Code. Targets CC v2.1.75+.

## What's Included

- **7 agents** - athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus
- **11 skills** - ca-review-code, ca-desloppify, ca-ship, ca-decide, ca-audit-security, ca-test-patterns, ca-document, ca-optimize, ca-handle-errors, ca-session-export, ca-commit
- **6 hook scripts** - guard-secrets, guard-commands, check-budget, validate-write, scan-completion, _lib
- **Template CLAUDE.md** - collaboration protocol and behavioral constraints for target projects

## Install

```bash
# To a project (Pro tier - all sonnet, haiku for test/docs)
./install.sh /path/to/project --pro

# To a project (Max tier - opus for athena/odysseus, sonnet for rest)
./install.sh /path/to/project --max

# Global install
./install.sh --global --pro
```

Requires: Claude Code >= 2.1.75, Python 3, jq.

The installer:

- Checks Claude Code version >= 2.1.75
- Validates Python 3 is available (required by hook scripts)
- Removes old agent and skill files from previous versions
- Copies agents with model substitution based on tier
- Copies all 11 skills to `.claude/skills/`
- Installs guard-secrets hook to `~/.claude/hooks/` (user-level)
- Bulk copies hook scripts to `.claude/hooks/scripts/` (project-level)
- Merges `settings.json` via `jq` (appends, never replaces)
- Copies `CLAUDE.md` template to project root (skips if exists)
- Validates: JSON, Python syntax, skill structure, model placeholders

## Agents

| Agent         | Pro Model | Max Model | Purpose                                  |
| ------------- | --------- | --------- | ---------------------------------------- |
| `@athena`     | sonnet    | opus      | Design, plan, architect                  |
| `@hephaestus` | sonnet    | sonnet    | Write code, fix bugs, build features     |
| `@nemesis`    | sonnet    | sonnet    | Review code, security audit              |
| `@atalanta`   | haiku     | haiku     | Run tests, parse failures, root causes   |
| `@calliope`   | haiku     | haiku     | Write/edit documentation (markdown only) |
| `@hermes`     | sonnet    | sonnet    | Research, explore codebase, cite sources |
| `@odysseus`   | sonnet    | opus      | Multi-step delegation, progress tracking |

## Skills

| Skill               | Slash Command        | Triggers                                     |
| ------------------- | -------------------- | -------------------------------------------- |
| `ca-review-code`    | `/ca-review-code`    | Writing, editing, or reviewing code          |
| `ca-desloppify`     | `/ca-desloppify`     | AI slop detection, "clean up", comment audit |
| `ca-ship`           | `/ca-ship`           | Commits, branches, PRs, git workflow         |
| `ca-decide`         | `/ca-decide`         | Decision making, tradeoffs, options          |
| `ca-audit-security` | `/ca-audit-security` | Security audit, OWASP, vulnerabilities       |
| `ca-test-patterns`  | `/ca-test-patterns`  | Writing tests, test strategy, coverage       |
| `ca-document`       | `/ca-document`       | READMEs, changelogs, ADRs, API docs          |
| `ca-optimize`       | `/ca-optimize`       | Performance, optimization, profiling         |
| `ca-handle-errors`  | `/ca-handle-errors`  | Error handling, Result types, exceptions     |
| `ca-session-export` | `/ca-session-export` | Session handoff, context preservation        |
| `ca-commit`         | `/ca-commit`         | Quick commits with Conventional Commits      |

## Hooks

**User-level** (`~/.claude/hooks/`):

| Hook             | Event      | What It Does                                                  |
| ---------------- | ---------- | ------------------------------------------------------------- |
| guard-secrets.py | PreToolUse | Blocks .env reads/writes, auth-header echoes, force-push main |

**Project-level** (`.claude/hooks.json`):

| Hook / Prompt      | Event                    | What It Does                                        |
| ------------------ | ------------------------ | --------------------------------------------------- |
| check-budget.py    | SessionStart             | Warns when CLAUDE.md/MEMORY.md exceeds line budget  |
| guard-commands.py  | PreToolUse (Bash)        | Blocks large-output commands, commit quality checks |
| validate-write.py  | PostToolUse (Write/Edit) | Auto-format, placeholder detection, comment slop    |
| scan-completion.py | SubagentStop, Stop       | Scans modified files for placeholder patterns       |
| LSP diagnostics    | PostToolUse (prompt)     | Prompts to check and fix type errors                |
| scope-check        | SubagentStop (prompt)    | Detects silent scope reduction by agents            |

## License

MIT
