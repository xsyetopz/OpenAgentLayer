# Caveman Provider

Caveman is an exact-upstream provider with `default = "sync-only"`.

`source/providers.toml` leaves macOS, Linux, and probe empty.
`source/integrations/caveman.toml` defines the response-style pack:

- allowed modes: `off`, `lite`, `full`, `ultra`, `wenyan-lite`, `wenyan`, `wenyan-ultra`
- default mode: `full`
- protected surfaces: `code`, `commands`, `paths`, `URLs`, `fenced code`, `exact errors`
