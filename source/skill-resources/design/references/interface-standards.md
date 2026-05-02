# Interface and product-surface standards

Use standards as constraints, not decoration.

- **Accessibility:** WCAG 2.2 for UI behavior, keyboard access, contrast, focus, naming, and error recovery.
- **Observability:** OpenTelemetry semantic conventions when traces, metrics, or logs are part of the design.
- **Architecture records:** ADR or MADR structure for decisions that affect module boundaries, public APIs, or long-lived tradeoffs.
- **CLI behavior:** POSIX conventions where applicable, clear exit codes, stable stdout for machines, stderr for diagnostics, and documented environment variables.
- **Config files:** JSON Schema, TOML tables, or provider-native schemas; preserve comments only in comment-supporting formats.
- **Security:** least privilege, explicit trust boundaries, audit evidence, and stable threat assumptions.
- **Compatibility:** name the versioning surface, migration path, and what existing clients or generated artifacts must keep working.

A design is incomplete when it leaves implementers to guess names, state transitions, error shape, validation point, or test target.
