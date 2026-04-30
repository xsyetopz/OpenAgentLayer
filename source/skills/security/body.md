# Security Checklist

## Injection (OWASP A03)

See `reference/owasp-checklist.md` for full injection patterns with code examples.

| Vector         | Check                                                    |
| -------------- | -------------------------------------------------------- |
| SQL            | Parameterized statements -- never concatenate user input |
| Command        | No user input in shell -- list args, `shell=False`       |
| XSS            | All output escaped in HTML context                       |
| Path traversal | Canonicalize paths, reject `..` sequences                |

## Authentication & Authorization (OWASP A01, A07)

- Auth checked before every sensitive operation - not just at the route level
- Session tokens are cryptographically random, sufficient length (128+ bits)
- Passwords hashed with bcrypt/scrypt/argon2 - never MD5/SHA-1/SHA-256 alone
- Rate limiting on login, registration, and password reset endpoints
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

- No known CVEs in direct dependencies - check with `bun audit`, `cargo audit`, `pip-audit`
- Lock files committed (package-lock.json, Cargo.lock, poetry.lock)
- Dependency update process documented and followed
- No unnecessary dependencies - each dep is a potential attack surface

## Error Handling

- Error messages to users reveal no internal details (stack traces, DB schemas, file paths)
- Errors logged with context for debugging but sanitized of secrets
- No catch-all error handlers that swallow exceptions silently
- 500 errors return generic message to client, log full details server-side

## API-Specific Attacks

See `reference/api-attacks.md` for SSRF, BOLA/IDOR, Mass Assignment, GraphQL, deserialization, and rate limiting with code examples.

## Review Output Format

```markdown
## Security Audit: [scope]

| #   | Severity | Category | File:Line | Finding | Remediation |
| --- | -------- | -------- | --------- | ------- | ----------- |

**Summary:** X critical, Y high, Z medium findings
```
