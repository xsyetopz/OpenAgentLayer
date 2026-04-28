# ADR-0003: Native Adapters Over Generic Prompt Rendering

## Status
Accepted

## Context

Supported tools expose different surfaces. A generic prompt dump cannot provide real native behavior.

## Decision

Each platform gets an adapter that maps canonical source to native rules, agents, skills, hooks, commands, MCP, workflows, or prompt-only surfaces.

## Consequences

Easier:

- truthful capability matrix
- platform-specific validation
- less prompt bloat
- better uninstall ownership

Harder:

- more adapter code
- source verification required per platform
