# Claude Code Agent System

Agent definitions, skills, and hooks for Claude Code. Designed for CC v2.1.71+.

## What's Included

- **7 agents** — architect, implement, audit, test, document, investigate, orchestrate
- **10 skills** — coding-standards, desloppify, git-workflow, collaboration-protocol, security-checklist, test-patterns, refactor-guide, documentation-standards, performance-guide, error-handling
- **8 hooks** — secret redaction (pre/post), LSP diagnostics, auto-format, anti-placeholder, anti-comment-slop, completion-check, pre-commit-quality
- **Template CLAUDE.md** — collaboration protocol and behavioral constraints for target projects

## Install

```bash
# To a project (Pro tier — all sonnet)
./install.sh /path/to/project --pro

# To a project (Max tier — opus for architect/orchestrate, sonnet for rest)
./install.sh /path/to/project --max

# Global install
./install.sh --global --pro
```

Requires: Claude Code >= 2.1.58, Python 3, jq.

The installer:

- Checks Claude Code version >= 2.1.58
- Validates Python 3 is available (required by hook scripts)
- Detects and removes old agent files (planner/coder/reviewer)
- Copies agents with model substitution based on tier
- Copies all 10 skills to `.claude/skills/`
- Installs redact hooks to `~/.claude/hooks/` (user-level)
- Bulk copies all hook scripts to `.claude/hooks/scripts/` (project-level)
- Merges `settings.json` via `jq` (appends, never replaces)
- Copies `CLAUDE.md` template to project root (skips if exists)
- Validates: JSON, Python syntax, banned patterns, model placeholders

## Agents

| Agent          | Pro Model | Max Model | Purpose                                        |
| -------------- | --------- | --------- | ---------------------------------------------- |
| `@architect`   | sonnet    | opus      | Design, plan, architect                        |
| `@implement`   | sonnet    | sonnet    | Write code, fix bugs, build features           |
| `@audit`       | sonnet    | sonnet    | Review code, security audit, verify changes    |
| `@test`        | sonnet    | sonnet    | Run tests, parse failures, diagnose root cause |
| `@document`    | sonnet    | sonnet    | Write/edit documentation (markdown only)       |
| `@investigate` | sonnet    | sonnet    | Research, explore codebase, cite sources       |
| `@orchestrate` | sonnet    | opus      | Coordinate multi-step tasks, delegate          |

All agents include a shared Collaboration Protocol: adaptive depth, tradeoff-first responses, finish-or-flag, and evidence-over-empathy.

## Skills

| Skill                     | Slash Command              | Triggers                                     |
| ------------------------- | -------------------------- | -------------------------------------------- |
| `coding-standards`        | `/coding-standards`        | Writing, editing, or reviewing code          |
| `desloppify`              | `/desloppify`              | AI slop detection, "clean up", comment audit |
| `git-workflow`            | `/git-workflow`            | Commits, branches, PRs                       |
| `collaboration-protocol`  | `/collaboration-protocol`  | Decision making, tradeoffs, options          |
| `security-checklist`      | `/security-checklist`      | Security audit, OWASP, vulnerabilities       |
| `test-patterns`           | `/test-patterns`           | Writing tests, test strategy, coverage       |
| `refactor-guide`          | `/refactor-guide`          | Refactoring, restructuring, extracting       |
| `documentation-standards` | `/documentation-standards` | READMEs, changelogs, ADRs, API docs          |
| `performance-guide`       | `/performance-guide`       | Performance, optimization, profiling         |
| `error-handling`          | `/error-handling`          | Error handling, Result types, exceptions     |

## Hooks

| Hook                  | Level   | Event                    | What It Does                                         |
| --------------------- | ------- | ------------------------ | ---------------------------------------------------- |
| redact-pre.py         | User    | PreToolUse               | Blocks auth header leaks, .env reads, scrubs secrets |
| redact-post.py        | User    | PostToolUse              | Redacts secrets from output, truncates at 30K        |
| pre-commit-quality.py | Project | PreToolUse (Bash)        | Blocks commits with secrets, .env, conflicts, TODOs  |
| LSP diagnostics       | Project | PostToolUse (Write/Edit) | Prompts to check and fix type errors                 |
| auto-format.sh        | Project | PostToolUse (Write/Edit) | Runs language-appropriate formatter                  |
| anti-placeholder.py   | Project | PostToolUse (Write/Edit) | Hard blocks TODO/stubs, warns on hedge language      |
| anti-comment-slop.py  | Project | PostToolUse (Write/Edit) | Warns on obvious/tautological comments               |
| completion-check.py   | Project | Stop, SubagentStop       | Scans modified files for placeholder patterns        |
| collaboration-check   | Project | SubagentStop (prompt)    | Verifies agents presented tradeoffs for decisions    |
| scope-check           | Project | SubagentStop (prompt)    | Detects silent scope reduction by agents             |

## License

MIT
