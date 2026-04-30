# Documentation Standards

## README Structure

```markdown
# Project Name

One sentence: what it does.

## Install

[Minimal steps to install]

## Usage

[Minimal working example]

## API

[If applicable - endpoints, functions, types]

## License

[License name]
```

Only add sections with real content. No empty Philosophy, Vision, or Why sections.

## Changelog

Follow [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [1.2.0] - 2026-03-13

### Added
- OAuth2 PKCE flow for authentication

### Changed
- Token refresh now happens 5 minutes before expiry

### Fixed
- Connection pool exhaustion under high concurrency
```

Categories: Added, Changed, Deprecated, Removed, Fixed, Security. Only include categories with entries.

## Architecture Decision Records (ADRs)

```markdown
# ADR-001: [Decision Title]

## Status
Accepted | Deprecated | Superseded by ADR-XXX

## Context
[What problem are we facing? What constraints exist?]

## Decision
[What we decided and why]

## Consequences
[What becomes easier, what becomes harder]
```

## API Documentation

For each endpoint/function:

```markdown
### POST /api/users

Creates a user account.

**Parameters:**
| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |

**Response:** `201 Created`
[Example response body]

**Errors:**
| Status | When                     |
| ------ | ------------------------ |
| 409    | Email already registered |
| 422    | Invalid email format     |
```

## Contrastive Examples

When documentation shows a wrong-vs-right, before-vs-after, or vulnerable-vs-fixed example, use one `diff` block instead of two separate code fences or inline `Bad:` / `Good:` pairs.

```diff
- const payload = jwt.verify(token, secret);
+ const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
```

Use `-` for the rejected pattern and `+` for the recommended pattern. Add a short prose label above the block if language or context would otherwise be unclear.

See `/cca:review` for inline documentation and comments policy.

See `/cca:deslop` for prohibited language patterns.
