# API standards

Choose standards by interface type. A local typed interface fits small in-process seams.

- **HTTP API:** OpenAPI 3.1 plus JSON Schema 2020-12 and RFC 9110 HTTP semantics.
- **Event API:** AsyncAPI or CloudEvents when events cross process or team boundaries.
- **Graph data:** GraphQL SDL when clients select fields dynamically.
- **Auth:** OAuth 2.0/OAuth 2.1 and OpenID Connect when third-party delegated auth exists; local tokens or mTLS when the surface is service-internal.
- **Errors:** RFC 9457 Problem Details for HTTP APIs when the product error contract allows it.
- **Telemetry:** OpenTelemetry traces, metrics, and logs when runtime observability is part of acceptance.

For each contract include: versioning, compatibility, auth, validation, errors, examples, and acceptance checks.
