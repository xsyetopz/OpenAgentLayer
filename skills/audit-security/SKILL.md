---
description: >
  Security audit checklist covering OWASP Top 10, secrets management, dependency vulnerabilities,
  and hardening. Triggers: security, audit, OWASP, vulnerability, hardening, CVE, secrets,
  injection, XSS, CSRF, authentication, authorization, penetration test.
user-invocable: true
---

# Security Checklist

Apply this checklist when reviewing code for security, auditing systems, or implementing security-sensitive features.

## Injection (OWASP A03)

| Vector             | Check                                            | Fix                                                    |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------ |
| SQL injection      | All queries use parameterized statements         | Never concatenate user input into SQL                  |
| Command injection  | No user input in shell commands                  | Use subprocess with list args, no shell=True           |
| XSS                | All output escaped in HTML context               | Use framework auto-escaping, escape dynamic attributes |
| Template injection | No user input in template expressions            | Use sandboxed templates, escape variables              |
| Path traversal     | File paths validated against allowed directories | Canonicalize paths, reject `..` sequences              |
| LDAP injection     | Queries use parameterized filters                | Escape special LDAP characters                         |
| Header injection   | No user input in HTTP headers without validation | Reject newlines in header values                       |

## Authentication & Authorization (OWASP A01, A07)

- Auth checked before every sensitive operation - not just at the route level
- Session tokens are cryptographically random, sufficient length (128+ bits)
- Passwords hashed with bcrypt/scrypt/argon2 - never MD5/SHA-1/SHA-256 alone
- Rate limiting on login, registration, and password reset endpoints
- Account lockout or exponential backoff after failed attempts
- JWT tokens validated: signature, expiry, issuer, audience
- RBAC/ABAC permissions checked at the data layer, not just UI

## Secrets Management (OWASP A02)

- No hardcoded secrets in source code - use environment variables or secret managers
- No secrets in logs, error messages, or API responses
- `.env` files in `.gitignore` - never committed
- API keys scoped to minimum required permissions
- Secrets rotated on schedule and on suspected compromise
- No secrets in URL query parameters (they appear in logs and referrer headers)

## Data Protection

- Sensitive data encrypted at rest (PII, credentials, financial data)
- TLS 1.2+ for all data in transit - no fallback to HTTP
- Sensitive fields excluded from logs and debug output
- Database backups encrypted
- Data retention policy enforced - delete what you don't need

## Dependencies

- No known CVEs in direct dependencies - check with `npm audit`, `cargo audit`, `pip-audit`
- Lock files committed (package-lock.json, Cargo.lock, poetry.lock)
- Dependency update process documented and followed
- No unnecessary dependencies - each dep is a potential attack surface

## Error Handling

- Error messages to users reveal no internal details (stack traces, DB schemas, file paths)
- Errors logged with context for debugging but sanitized of secrets
- No catch-all error handlers that swallow exceptions silently
- 500 errors return generic message to client, log full details server-side

## API-Specific Attacks

| Vector                         | Severity | Check                                                                                  | Fix                                                                           |
| ------------------------------ | -------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| SSRF                           | CRITICAL | User-controlled URLs never passed to internal HTTP clients                             | Allowlist target domains, block 169.254.169.254 and RFC-1918 ranges           |
| Mass Assignment / Over-posting | HIGH     | Request bodies not bound directly to model objects without filter                      | Explicit allowlist of accepted fields; never `Object.assign(req.body)`        |
| Insecure Deserialization       | CRITICAL | No untrusted data deserialized via pickle, yaml.load, ObjectInputStream, JSON revivers | Use safe loaders (yaml.safe_load), validate schema before deserializing       |
| BOLA / IDOR                    | HIGH     | Resource ownership verified server-side before returning or mutating                   | Check `resource.owner_id == current_user.id` at service layer, not just route |
| GraphQL - unbounded depth      | HIGH     | Query depth and complexity limits enforced                                             | Set max depth (≤10), complexity budget, disable introspection in production   |
| GraphQL - batching abuse       | MEDIUM   | Batch query count capped per request                                                   | Limit batch size, apply per-operation rate limits                             |
| Rate Limiting Bypass           | HIGH     | Auth, password reset, and API key endpoints have rate limits                           | Enforce limits by IP + account; use token bucket or leaky bucket              |

## Review Output Format

```markdown
## Security Audit: [scope]

| #   | Severity | Category | File:Line | Finding | Remediation |
| --- | -------- | -------- | --------- | ------- | ----------- |

**Summary:** X critical, Y high, Z medium findings
```

## Severity Levels

| Level    | Definition                                    | SLA               |
| -------- | --------------------------------------------- | ----------------- |
| CRITICAL | Actively exploitable, data exposure likely    | Fix before deploy |
| HIGH     | Exploitable with effort, significant impact   | Fix this sprint   |
| MEDIUM   | Requires specific conditions, moderate impact | Fix this quarter  |
| LOW      | Defense-in-depth improvement                  | Backlog           |
