# ADR-0001: OAL Product Boundary

## Status
Accepted

## Context

Coding-agent tools expose different native surfaces: rules files, config, hooks, permissions, skills, commands, local plugin formats, and model-routing options. OAL targets a harness on top of those tools, not another prompt pack.

The OpenAI harness engineering article points at the right shape: small entry docs, repository knowledge as system of record, agent-legible tools, mechanical enforcement, and feedback loops that let agents execute instead of requiring humans to paste context.

## Decision

OAL is a new product:

- product: `OpenAgentLayer`
- short name: `OAL`
- CLI: `oal`
- runner: `oal-runner`
- package scope if needed later: `@openagentlayer/*`
- crate prefix: `oal-*`

OAL owns:

- native adapter rendering
- install/uninstall manifests
- command runner and token-output strategy
- hook contracts and evidence gates
- model routing policy
- validation and doctor checks
- planning docs and roadmap

OAL does not own:

- model hosting
- editor extension marketplaces
- native Windows support
- transition modes
- generic chatbot therapy or life-advice behavior

## Consequences

Easier:

- clean implementation plan
- direct runtime ownership
- measurable validation
- no ambiguous old names

Harder:

- users install OAL as a new tool
- all public docs must change names
- generated output must come from OAL source specs
