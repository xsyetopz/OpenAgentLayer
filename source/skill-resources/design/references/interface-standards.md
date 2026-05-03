# Interface standards

Use standards as constraints that fit the surface.

- UI accessibility: WCAG 2.2 AA for web, platform HIG/accessibility APIs for native.
- CLI: POSIX conventions, structured stderr/stdout, non-interactive flags, stable exit codes.
- Config: JSON Schema for JSON/YAML/TOML-like config, provider schema when available.
- Data interchange: JSON Schema, Protocol Buffers, or Avro according to existing stack.
- Security: least privilege, explicit trust boundaries, auditable credentials flow.
