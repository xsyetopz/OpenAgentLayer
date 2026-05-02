# Git safety

Order for git work:

1. `git status --short`.
2. `git diff --stat` before detailed diffs.
3. Separate user-owned changes from this task.
4. Stage only intentional files.
5. Commit with a why-focused message and required trailers.

For pre-commit setup, detect the package manager from lockfiles. Add only hooks that run existing project commands. Do not add Husky, lint-staged, or formatter config unless the repo needs them and the user asked for that setup.
