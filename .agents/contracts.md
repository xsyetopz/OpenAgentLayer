# OpenAgentLayer agent contracts

## Parent session

- Own task split, subagent launch, wait/merge, and final decision.
- Assign one bounded output per child agent.
- Merge final summaries, changed paths, validation output, and blockers.

## Child agent

- Stay inside the assigned route, paths, and runtime cap.
- Return changed behavior and evidence.
- Return `STATUS BLOCKED` with Attempted, Evidence, and Need when blocked.

## Validation

- Use the smallest test or acceptance gate that covers the changed behavior.
- Treat generated artifacts as outputs of authored source.
- Inspect final diffs before reporting completion.
