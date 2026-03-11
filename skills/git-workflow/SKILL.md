---
name: git-workflow
description: Git workflow conventions for commits, branches, and PRs. Use when the user mentions "commit", "branch", "PR", "pull request", "merge", "rebase", "git workflow", or asks about commit message format, branch naming, or PR templates.
---

# Git Workflow

## Commit Messages

Format: `type(scope): description`

This is the [Conventional Commits](https://www.conventionalcommits.org/) standard. The type categorizes the change, the scope narrows it to a module/area, and the description says what changed.

### Types

| Type       | When to use                                       |
| ---------- | ------------------------------------------------- |
| `feat`     | New user-facing functionality                     |
| `fix`      | Bug fix                                           |
| `refactor` | Code restructuring with no behavior change        |
| `perf`     | Performance improvement                           |
| `test`     | Adding or updating tests only                     |
| `docs`     | Documentation only                                |
| `chore`    | Build, tooling, dependency updates                |
| `ci`       | CI/CD pipeline changes                            |
| `style`    | Formatting, whitespace, linting (no logic change) |

### Scope

The scope in parentheses identifies the area of the codebase affected. Use the module, component, or subsystem name. Skip scope only for cross-cutting changes.

```text
feat(auth): add OAuth2 PKCE flow
fix(parser): handle unterminated string literals
refactor(db): extract connection pooling into module
perf(api): batch user lookups to eliminate N+1
test(billing): add edge cases for proration
docs(readme): update install instructions
chore(deps): bump tokio to 1.38
ci(github): add cargo deny check to pipeline
```

### Rules

1. Imperative mood: "add feature" not "added feature" or "adds feature"
2. Subject line max 72 characters (type + scope + colon + space + description)
3. No period at end of subject line
4. Body explains **why**, not what — the diff shows what changed
5. Breaking changes: add `!` after scope — `feat(api)!: remove v1 endpoints`
6. Reference issues in body or footer: `Closes #123`

### Body and Footer

Use a blank line to separate subject from body. The body provides context the diff can't: why the change was made, what alternatives were considered, what tradeoffs exist.

```text
fix(auth): reject expired refresh tokens

Previously, expired refresh tokens were silently accepted and
exchanged for new access tokens. This allowed indefinite session
extension without re-authentication.

Closes #187
```

### Claude Code Commit Format

Always use HEREDOC for commit messages to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add token refresh on expiry

Tokens now auto-refresh 5 minutes before expiry to prevent
mid-request auth failures.

Closes #42

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Common Mistakes

| Wrong                                                | Right                                        | Why                                    |
| ---------------------------------------------------- | -------------------------------------------- | -------------------------------------- |
| `fix: fixed the bug`                                 | `fix(parser): handle EOF in strings`         | Past tense, no scope, vague            |
| `update stuff`                                       | `refactor(db): extract pool config`          | No type, meaningless description       |
| `feat: add new feature for users to reset passwords` | `feat(auth): add password reset`             | Too long, redundant words              |
| `Fix bug`                                            | `fix(api): return 404 for deleted resources` | No type prefix, capitalized, vague     |
| `chore: various improvements`                        | Split into separate commits                  | Multiple changes need multiple commits |

## Branch Naming

| Pattern           | Purpose                             |
| ----------------- | ----------------------------------- |
| `main` / `master` | Production code                     |
| `feat/<name>`     | New feature                         |
| `fix/<name>`      | Bug fix                             |
| `refactor/<name>` | Refactoring without behavior change |
| `chore/<name>`    | Maintenance                         |

Names: lowercase, hyphens, no slashes beyond the prefix. Example: `feat/token-refresh`

## Pull Requests

1. Title follows Conventional Commits format
2. Description template:

   ```markdown
   ## Summary
   <1-3 bullet points>

   ## Test plan
   - [ ] Test case 1
   - [ ] Test case 2
   ```

3. One PR solves one problem — no drive-by fixes
4. Rebase to main before merge, prefer squash merge for small PRs

## Workflow

1. Create branch from main
2. Commit focused changes (one logical change per commit)
3. Run tests before pushing
4. Create PR with clear description
5. Address review feedback in new commits (don't force-push during review)
6. Squash merge after approval
