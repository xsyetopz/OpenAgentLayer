# opendex

Rust control-plane and daemon core for OpenDex.

OpenDex gives OAL a Robdex-style bridge surface without making the control-plane
core a catch-all object. A parent orchestrator owns projects, worker and QA
thread records, artifact routing, continuation decisions, approvals, live
process tracking, event replay, archival, and usage guardrails.

The crate is split by reason to change:

- `control_plane/`: project, agent, artifact, runtime, event, and spawn
  guardrail behavior behind the stable `ControlPlane` facade.
- `daemon.rs`: bounded HTTP daemon routes for health, state, replay, thread
  mutation, orchestrator actions, approvals, and live process registration.
- `persistence.rs`: snapshot persistence for the daemon state file.
- `json.rs`: response rendering kept outside the domain model.

Run:

```sh
cargo run -p opendex -- --version
cargo run -p opendex -- serve --addr 127.0.0.1:8765 --state .openagentlayer/opendex/state.json
```
