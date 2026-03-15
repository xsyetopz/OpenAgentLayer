---
name: ca-commit
description: >
  Focused commit workflow with Conventional Commits format. Subset of ca-ship for
  quick commits. Triggers: commit, git commit, save changes, commit message, stage and commit.
user-invocable: true
---

# Commit Workflow

## Conventional Commits

Format: `<type>(<scope>): <description>`

| Type     | When                                |
| -------- | ----------------------------------- |
| feat     | New feature                         |
| fix      | Bug fix                             |
| refactor | Restructure without behavior change |
| docs     | Documentation only                  |
| test     | Adding/fixing tests                 |
| chore    | Build, deps, config                 |
| perf     | Performance improvement             |

## Process

1. `git diff --stat` to see what changed
2. `git diff --cached --stat` for already-staged files
3. Stage specific files: `git add <file1> <file2>` (never `git add .`)
4. Write commit message via HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Pre-Commit Checks

Before committing, verify no staged files contain:

- `.env` or credential files
- Merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- Placeholder code (TODO, FIXME, stub bodies)
- Hardcoded secrets or API keys

## Rules

- One logical change per commit
- Description focuses on "why" not "what"
- Never amend published commits without asking
- Never force-push to main/master
- Never skip hooks (--no-verify)
