# v4 decisions

Purpose: accepted OpenAgentLayer v4 decisions.

Authority: decision log. Specs encode the final behavior.

## Decisions

### DECISION: v4 is a reboot

- [x] Sealed — v4 does not preserve old behavior as a requirement.
- [x] Sealed — v3 is study input.
- [x] Sealed — Specs define new behavior directly.

### DECISION: product category is layer

- [x] Sealed — OpenAgentLayer is a portable agent behavior layer.
- [x] Sealed — It is not a harness.
- [x] Sealed — It is not an application framework.

### DECISION: source graph first

- [x] Sealed — Agents, commands, skills, policies, and guidance are source records.
- [x] Sealed — Adapters render native surface files from source records.

### DECISION: enforcement beats prose

- [x] Sealed — Runtime guards are first-class.
- [x] Sealed — Hook behavior is tested.
- [x] Sealed — Prose instructions do not replace enforcement.

### DECISION: Bun runtime direction

- [x] Sealed — Build and installer target Bun.
- [x] Sealed — Hook implementations remain `.mjs` where surface execution expects JavaScript files.

