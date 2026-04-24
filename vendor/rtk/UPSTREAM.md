# Bundled RTK upstream

- Upstream: https://github.com/rtk-ai/rtk
- Upstream commit: `80a6fe606f73b19e52b0b330d242e62a6c07be42`
- Synced: 2026-04-24

## openagentsbtw patches

This tree is the RTK source used by openagentsbtw installers when building managed RTK. Local patches add rewrite coverage needed by openagentsbtw RTK enforcement:

- `bun`, `bunx`, and `bunx --cwd` test/typecheck/biome rewrites
- `dotnet format/test/restore`, `flutter`, `adb`, `sbt`, `gradle`, and `xcodebuild` rewrites
- `jq`, `env`, and `sed -n 1,Np` compact rewrites
- curl truncation remains deterministic even when tee cannot write in the caller environment
- workspace lint/profile policy adapted from openagentsbtw-family Rust projects
- tests for the added rewrite matrix
