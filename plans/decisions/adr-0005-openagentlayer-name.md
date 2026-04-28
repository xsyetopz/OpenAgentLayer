# ADR-0005: OpenAgentLayer Name

## Status
Accepted

## Context

OAL is a layer above existing coding tools. The name needs to avoid implying a standalone agent runtime or operating system.

## Decision

Use **OpenAgentLayer**.

Names:

- product: `OpenAgentLayer`
- short name: `OAL`
- CLI: `oal`
- runner: `oal-runner`
- crate prefix: `oal-*`
- package scope if needed later: `@openagentlayer/*`
- tagline: `harness layer for coding agents`

## Consequences

Easier:

- clear product reset
- short CLI name
- accurate layer positioning

Harder:

- documentation must describe the layer boundary clearly
- install and uninstall state must stay product-owned and predictable
