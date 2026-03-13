# Claude Code Agent System

7 agents, 10 skills, split-level hooks. Targets CC v2.1.71+.

## Agents

| Agent       | Placeholder             | Pro    | Max    | Purpose                                  |
| ----------- | ----------------------- | ------ | ------ | ---------------------------------------- |
| architect   | `__MODEL_ARCHITECT__`   | sonnet | opus   | Design, plan, architect                  |
| implement   | `__MODEL_IMPLEMENT__`   | sonnet | sonnet | Write code, fix bugs, build features     |
| audit       | `__MODEL_AUDIT__`       | sonnet | sonnet | Review code, security audit, run tests   |
| test        | `__MODEL_TEST__`        | sonnet | sonnet | Run tests, parse failures, root causes   |
| document    | `__MODEL_DOCUMENT__`    | sonnet | sonnet | Write/edit documentation (markdown only) |
| investigate | `__MODEL_INVESTIGATE__` | sonnet | sonnet | Research, explore codebase, cite sources |
| orchestrate | `__MODEL_ORCHESTRATE__` | sonnet | opus   | Multi-step delegation, progress tracking |

## Skills

| Skill                     | Slash Command              | Status  |
| ------------------------- | -------------------------- | ------- |
| `coding-standards`        | `/coding-standards`        | Updated |
| `desloppify`              | `/desloppify`              | Updated |
| `git-workflow`            | `/git-workflow`            | Updated |
| `collaboration-protocol`  | `/collaboration-protocol`  | New     |
| `security-checklist`      | `/security-checklist`      | New     |
| `test-patterns`           | `/test-patterns`           | New     |
| `refactor-guide`          | `/refactor-guide`          | New     |
| `documentation-standards` | `/documentation-standards` | New     |
| `performance-guide`       | `/performance-guide`       | New     |
| `error-handling`          | `/error-handling`          | New     |
| `session-export`          | `/session-export`          | New     |

## Hooks

**User-level** (`~/.claude/hooks/`):

- `redact-pre.py` — PreToolUse secret scrubbing (.env blocking, AWS/GitHub/JWT detection)
- `redact-post.py` — PostToolUse output redaction (30K threshold)

**Project-level** (`.claude/hooks.json`):

- PreToolUse on Bash → `pre-commit-quality.py` (blocks commits with secrets/TODOs/.env/conflicts)
- PostToolUse on Write/Edit → LSP diagnostics + `auto-format.sh` + `anti-placeholder.py` + `anti-comment-slop.py`
- SubagentStop → scope reduction check + `completion-check.py` + collaboration protocol check
- Stop → `completion-check.py` + session-export reminder

## Install

```bash
./install.sh /path/to/project --pro   # sonnet
./install.sh /path/to/project --max   # opus/sonnet
./install.sh --global --pro           # ~/.claude/
```

## File Structure

```text
agents/          architect.md, implement.md, audit.md, test.md,
                 document.md, investigate.md, orchestrate.md
skills/          coding-standards/, desloppify/, git-workflow/,
                 collaboration-protocol/, security-checklist/,
                 test-patterns/, refactor-guide/,
                 documentation-standards/, performance-guide/,
                 error-handling/, session-export/
hooks/           hooks.json, redact-pre.py, redact-post.py,
                 scripts/auto-format.sh, scripts/_patterns.py,
                 scripts/anti-placeholder.py, scripts/anti-comment-slop.py,
                 scripts/completion-check.py, scripts/pre-commit-quality.py
templates/       CLAUDE.md (installed to target projects)
install.sh       Version check, Python check, tier flags, model substitution, migration
```
