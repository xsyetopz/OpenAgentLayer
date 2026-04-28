# RTK Provider

RTK is an exact-upstream provider with `default = "external-binary"`.

- macOS install: `brew install rtk-ai/tap/rtk`
- probe: `rtk --version`, `rtk gain`, `rtk rewrite <command>`

`source/integrations/rtk.toml` keeps RTK external and falls back to OAL runner budgets when RTK does not support a command.
