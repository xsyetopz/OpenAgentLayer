# OpenAgentLayer Codex contracts

## Render contract

Codex artifacts must be reproducible from authored source and adapter renderer
logic. Stable repo invariants belong in provider instructions. Fast-changing
workflows belong in skills, commands, hooks, or routes.

## Runtime contract

Hooks provide source evidence, route context, command policy, and completion
evidence. Hook guidance should point users to current OAL-owned surfaces.

## Acceptance contract

Codex changes should be covered by the nearest adapter, runtime, CLI, deploy, or
acceptance test. Provider-facing behavior should be validated through rendered
artifact content where possible.
