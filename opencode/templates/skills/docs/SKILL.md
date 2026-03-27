---
name: docs
description: Standards for writing documentation: READMEs, changelogs, ADRs, API docs, and inline docs. Triggers: documentation, docs, README, changelog, ADR, architecture decision record, API documentation, doc standards, write docs, update docs.
compatibility: opencode
---
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

See `/cca:review` for inline documentation and comments policy.

See `/cca:desloppify` for prohibited language patterns.
