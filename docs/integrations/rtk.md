# RTK Integration

RTK is external. OAL does not vendor or reimplement RTK.

OAL behavior:

- `oal doctor` probes RTK availability and capability tags.
- `oal-runner` uses RTK only when the capability map says the command is supported and useful.
- Unsupported commands keep their shell semantics and use OAL output budgets.
- Package-manager choice comes from repo evidence, not from OAL preference.

Source spec: `source/integrations.toml`.
