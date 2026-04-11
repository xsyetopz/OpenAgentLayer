# Caveman Help

Explain the available Caveman modes and their boundaries.

## Required Points

- Managed default modes: `off`, `lite`, `full`, `ultra`, `wenyan-lite`, `wenyan`, `wenyan-ultra`
- Current session escape hatches:
  - `stop caveman`
  - `normal mode`
- Future-session config:
  - `./config.sh --caveman-mode off`
  - `./config.sh --caveman-mode <mode>`

## Boundaries

- Always-on Caveman changes assistant prose only.
- Normal clarity still overrides Caveman for security warnings, destructive confirmations, and ambiguity-sensitive instructions.
- `caveman-commit`, `caveman-review`, and `caveman-compress` are explicit-only skills. They do not auto-run just because Caveman mode is active.
