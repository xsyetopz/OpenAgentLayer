# API design standards

Choose standards by interface type. Do not force a standard where a local typed interface is enough.

**Use these defaults:**

- **HTTP APIs:** OpenAPI 3.1 or newer for operations, parameters, request bodies, responses, examples, security schemes, callbacks, links, tags, and reusable components.
- **Data schemas:** JSON Schema 2020-12 for JSON payload validation, reusable schema definitions, and examples.
- **Event-driven APIs:** AsyncAPI for channels, operations, messages, bindings, and broker-specific details.
- **Graph APIs:** GraphQL SDL for schema shape, typed fields, mutations, subscriptions, directives, and deprecation markers.
- **Event envelopes:** CloudEvents for interoperable event metadata when events cross service boundaries.
- **Error payloads:** RFC 9457 Problem Details for HTTP APIs unless the product already has a stronger error contract.
- **Auth and identity:** OAuth 2.0 and OpenID Connect terms when designing delegated auth, token exchange, scopes, claims, or identity flows.
- **HTTP behavior:** RFC 9110 semantics for methods, status codes, caching, negotiation, and conditional requests.
- **Webhooks:** OpenAPI webhooks or AsyncAPI depending on ownership and transport.

**Output contract for API design:**

1. name the interface type and chosen standard;
2. define resources, operations, events, or fields;
3. define schemas and examples;
4. define auth, permissions, errors, idempotency, pagination, versioning, and compatibility when relevant;
5. define validation and conformance checks.
