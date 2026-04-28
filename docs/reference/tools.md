# Tool Registry

`source/tools.toml` is the source of truth.

| Tool | purpose | macOS install | Linux install | probe | use policy |
| --- | --- | --- | --- | --- | --- |
| `rtk` | command-output filter and capability probe | `brew install rtk-ai/tap/rtk` | — | `rtk --version`; `rtk gain` | always prefer rtk filters when capability exists |
| `bun` | package/runtime manager | `brew install oven-sh/bun/bun` | — | `bun --version` | use repo lockfile evidence before install command selection |
| `git` | repo diff/history tool | `xcode-select --install` | `apt-get install git` | `git --version` | check diff stat before detailed review |
| `context7` | third-party docs lookup | `npm i -g @upstash/context7-mcp` | `npm i -g @upstash/context7-mcp` | `context7 --version`; `ctx7 --version` | optional; use when third-party API docs evidence needed |
