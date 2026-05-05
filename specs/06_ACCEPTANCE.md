# Acceptance Contract

Acceptance proves OAL as a product. It must cover source, rendering, deploy,
uninstall, provider artifacts, hooks, plugins, and release metadata.

## Required Command

```bash
bun run accept
```

This command must pass in a clean fixture root without relying on the developer
home directory.

## Required Checks

Acceptance must verify:

1. source records load and validate
2. model allowlists reject unsupported models
3. provider renderers produce real artifacts
4. generated configs parse where possible
5. hooks are executable and fixture-tested
6. deploy preserves user-owned content
7. manifests track owned material
8. uninstall acts only on owned material
9. plugin payload sync writes and prunes OAL-owned cache entries
10. generated/source drift is detected
11. docs and specs are connected active product paths
12. release version files agree

## Test Style

Tests should assert behavior, not implementation trivia. Prefer rendered
artifact paths, parsed config values, manifest entries, hook decisions, provider
output, CLI exit codes, concise message substrings, and release witness fields.

Avoid tests that only check that prose exists.
