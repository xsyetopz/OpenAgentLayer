# Validate and Release

Use focused validation during implement, then run full product gates before
release or write-handoff.

## Core Checks

```bash
bun run oal:check
bun run test
bun run oal:accept
bun run biome:check
bunx tsc --noEmit
```

`bun run oal:accept` is the product gate. It covers source loading, policy, provider
rendering, deploy fixtures, uninstall fixtures, hooks, plugin payloads,
manifests, installed-state checks, release metadata, upstream Codex submodule
metadata, the tracked Codex base-instruction patch artifact, and the Codex
reddit research disposition.

Codex provider-e2e proves deployed hook behavior. It does not prove
administrator installation of `requirements.toml` into Codex's managed
requirements layer; treat that as a separate environment gate.

## RTK Efficiency

OAL hooks prefer native RTK filters for supported commands:

```bash
rtk gain
bun run oal:rtk-gain -- --allow-empty-history
bun packages/cli/src/main.ts rtk-report --project "$PWD"
```

Keep command output bounded. Use `rtk proxy -- <command>` only when the command
lacks a native RTK filter or the filtered output is not useful.

## Release Hygiene

Before a release, run:

```bash
bun run oal:accept
bun run test
bun run biome:check
bunx tsc --noEmit
ruby -c homebrew/Casks/openagentlayer.rb
```

Keep generated artifacts disposable. Update authored source, renderer code, or
deploy logic, then regenerate or validate.
