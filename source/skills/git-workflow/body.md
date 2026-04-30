## Before Proceeding

Run these commands to understand the current git state:

```bash
git diff --cached --stat 2>/dev/null || echo 'nothing staged'
git log --oneline -5 2>/dev/null || echo 'no commits'
```

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

1. Active present tense: "add feature" not "added feature" or "adds feature"
2. Subject line max 72 characters (type + scope + colon + space + description)
3. No period at end of subject line
4. Body explains **why**, not what - the diff shows what changed
5. Breaking changes: add `!` after scope - `feat(api)!: remove v1 endpoints`
6. Reference issues in body or footer: `Closes #123`
7. Start with an action verb: "Add", "Fix", "Remove" -- not "Gracefully handle", "Elegantly refactor"
8. No filler adjectives in the description: avoid "thorough", "clean", "proper" and similar padding

### Body and Footer

Use a blank line to separate subject from body. The body provides context the diff can't: why the change was made, what alternatives were considered, what tradeoffs exist.

```text
fix(auth): reject expired refresh tokens

Previously, expired refresh tokens were silently accepted and
exchanged for new access tokens. This allowed indefinite session
extension without re-authentication.

Closes #187
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

3. One PR solves one problem - no drive-by fixes
4. Rebase to main before merge, prefer squash merge for small PRs

## Pre-Commit Quality

The `pre-commit-quality` hook automatically checks staged files before `git commit` for:

- Secrets and credentials (API keys, tokens, AWS keys, GitHub tokens, JWTs)
- `.env` files (should never be committed)
- Merge conflict markers
- TODO/FIXME markers in non-test files

If the hook blocks a commit, fix the issue before retrying.

## Safe Git Pipeline

AI drafts, humans approve. Never run `git push` or `git commit` without first presenting the user with what will happen.

### Phase 1 - Prepare

AI runs these; no human approval needed:

```bash
git status --porcelain              # what's changed
git diff --stat                     # scope check
git add <specific files>            # stage targeted files only - never git add .
git diff --cached --stat            # verify staged set
```

Present a commit message draft for the user to review before proceeding.

### Phase 2 - Commit

Human runs the commit, or AI runs it only after explicit approval. Apply the platform-specific attribution policy when the AI executes the commit:

__SHIP_COMMIT_ATTRIBUTION_POLICY__

If the trailer is missing, append the platform's canonical `Co-Authored-By` trailer automatically.
If a known canonical domain is malformed (for example `noreply@openai`), block the commit command until fixed.

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Body explaining why, not what.

__SHIP_COMMIT_FOOTER_BLOCK__
EOF
)"
```

### Phase 3 - Push + PR

AI drafts the PR body; human runs the push:

```bash
gh pr create \
  --title "type(scope): description" \
  --body "$(cat <<'EOF'
## Summary
- What changed and why (not a list of files)

## Test plan
- [ ] Unit tests pass
- [ ] Manual: steps to verify
EOF
)" \
  --base main \
  --head feat/your-branch
```

Never run `git push --force` to main/master under any circumstances. Flag it and refuse.

## Workflow

1. Create branch from main
2. Commit focused changes (one logical change per commit)
3. Run tests before pushing
4. Create PR with clear description
5. Address review feedback in new commits (don't force-push during review)
6. Squash merge after approval
