## Summary

<!-- What does this PR do? 1-3 bullet points. -->

## Component

<!-- Which part of the system? -->
- [ ] Shared source/generator (`source/`, `scripts/`)
- [ ] Claude assets (`claude/`)
- [ ] Codex assets (`codex/`)
- [ ] OpenCode assets (`opencode/`)
- [ ] Installer/build scripts
- [ ] CI/CD (.github/workflows/)
- [ ] Documentation
- [ ] Other

## Testing

<!-- How did you verify this works? -->
- [ ] `bun run generate` passes
- [ ] `bun run check:generated` passes
- [ ] `bun test tests claude/tests codex/tests` passes
- [ ] `cd opencode && bun test && bun run typecheck` passes
- [ ] Tested install with `CI=true ./install.sh`
- [ ] Tested in a live CLI session

## Checklist

- [ ] No placeholder code <!-- cca-allow -->
- [ ] No secrets or credentials in the diff
- [ ] Generated artifacts refreshed if source changed
- [ ] Docs updated if platform behavior changed
