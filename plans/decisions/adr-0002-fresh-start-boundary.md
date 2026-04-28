# ADR-0002: Fresh Start Boundary

## Status
Accepted

## Context

OAL is a new product with its own runtime, source specs, adapters, and install state. Transition modes would add extra behavior that users do not need for coding-agent harness work.

## Decision

No transition mode, alias surface, or one-off public flags.

## Consequences

Easier:

- clean architecture
- less false state
- simpler docs
- stronger tests

Harder:

- install state stays simple
- release notes can describe OAL directly
