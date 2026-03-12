# Claude Code Agent System

Agent definitions, skills, and hooks for Claude Code. Designed for CC v2.1.71+.

## What's Included

- **3 agents** — planner (architecture), coder (implementation), reviewer (testing/review)
- **3 skills** — coding-standards, desloppify, git-workflow
- **4 hooks** — secret redaction (pre/post), LSP diagnostics, auto-format
- **Template CLAUDE.md** — behavioral constraints for target projects

## Install

```bash
# To a project (Pro tier — sonnet)
./install.sh /path/to/project --pro

# To a project (Max tier — opus/sonnet)
./install.sh /path/to/project --max

# Global install
./install.sh --global --pro
```

The installer:
- Checks Claude Code version >= 2.1.71
- Copies agents with model substitution based on tier
- Copies skills to `.claude/skills/`
- Installs redact hooks to `~/.claude/hooks/` (user-level)
- Installs project hooks to `.claude/` (project-level)
- Merges `settings.json` via `jq` (appends, never replaces)
- Copies `CLAUDE.md` template to project root (skips if exists)
- Validates installed files

## Agents

| Agent       | Pro Model | Max Model | Routes                                              |
| ----------- | --------- | --------- | --------------------------------------------------- |
| `@planner`  | sonnet    | opus      | plan, design, architect, "how should I", break down |
| `@coder`    | sonnet    | sonnet    | implement, code, write, build, fix, add, refactor   |
| `@reviewer` | sonnet    | sonnet    | review, test, verify, check, audit, run tests       |

## Skills

| Skill              | Triggers                                      |
| ------------------ | --------------------------------------------- |
| `coding-standards` | Writing, editing, or reviewing code           |
| `desloppify`       | AI slop detection, "clean up", comment audits |
| `git-workflow`     | Commits, branches, PRs                        |

## Hooks

| Hook            | Level   | Event                    | What It Does                                           |
| --------------- | ------- | ------------------------ | ------------------------------------------------------ |
| redact-pre.py   | User    | PreToolUse               | Blocks auth header leaks, scrubs secrets               |
| redact-post.py  | User    | PostToolUse              | Redacts secrets from output, truncates large responses |
| LSP diagnostics | Project | PostToolUse (Write/Edit) | Prompts to check and fix type errors                   |
| auto-format.sh  | Project | PostToolUse (Write/Edit) | Runs language-appropriate formatter                    |

## License

MIT
