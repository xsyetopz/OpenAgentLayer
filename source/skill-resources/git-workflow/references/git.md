# Git workflow

1. Run `git status --short` or `rtk git -C . status --short`.
2. Classify user changes versus agent changes.
3. Use path-specific diffs before staging.
4. Stage owned paths only.
5. Commit when requested or when the route requires a commit artifact.
6. Use a Conventional Commits 1.0.0 subject and include trailers required by the repo.

For pre-commit setup, detect the package manager from lockfiles. Add hooks that run existing project commands. Husky, lint-staged, and formatter config enter the edit envelope through repo need plus user setup request.
