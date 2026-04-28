# Language and Runtime Plan

## Decision

OAL v4 is Rust-first.

- **Rust** for product runtime: CLI, runner, hook engine, install/uninstall, validation, model policy, adapter rendering.
- **TOML/JSON** for source specs and generated native config.
- **Markdown** for plans, ADRs, platform research, roadmap, and human review.
- **POSIX shell** for bootstrap only.

## Why Rust

OAL must do process work correctly. It must parse commands, apply token budgets, stream output, preserve exit codes, run in hooks, and avoid shell-injection drift. Rust gives one binary, predictable errors, fast filters, typed config, and low dependency on platform runtimes.

Rust also fits macOS/Linux distribution. Windows native is out of scope; WSL2 follows Linux paths.

## Why Not Go

Go would work for CLI/process tooling, but the repo already has Rust toolchain direction and strict lints. Rust gives stronger type-state options for contracts, lower-level process control, and better fit for command parser/filter internals. Go adds a second ecosystem without a clear benefit.

## Why Not MJS/TypeScript

MJS/TS are useful for fast adapter experiments, but OAL needs fewer installed runtime surfaces. Hook and runner behavior must not depend on scattered scripts, fragile imports, or string-heavy command rewriting.

TypeScript can still be used by target tools that require generated plugin code, but OAL should generate those artifacts from Rust-owned source and test them as output, not depend on them as OAL core.

## Why Not Python

Python is good for research scripts and text transforms. It is not good as the installed hook/runtime path here: interpreter version, package environment, startup cost, and deployment state add risk.

## Why Shell Is Bootstrap Only

Shell is kept for:

- install curl pipe entrypoint
- path detection handoff
- invoking the Rust binary

Shell must not own:

- command parsing beyond exec handoff
- model routing
- hook policy
- output compaction
- install manifests
- generated artifact rendering

## Runtime CLI

Required commands:

- `oal install <platform>`
- `oal uninstall <platform>`
- `oal render <platform>`
- `oal check <platform>`
- `oal doctor`
- `oal doctor rtk`
- `oal hook <platform> <event>`
- `oal run -- <command...>`

## OS Policy

Supported:

- macOS arm64/x64
- Linux arm64/x64
- WSL2 as Linux

Unsupported:

- Windows native PowerShell/cmd install
- Windows registry/AppData adapter paths
- native `.ps1` wrappers

Unsupported Windows native should fail with a direct message: `OAL supports Windows through WSL2 only.`
