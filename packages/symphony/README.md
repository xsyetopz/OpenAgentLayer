# @openagentlayer/symphony

Symphony is a local scheduler for Linear-backed coding-agent work. It reads a repository `WORKFLOW.md`, polls Linear for active issues, creates one workspace per issue, and runs Codex app-server turns inside that workspace.

## OpenDex

OpenDex is the OAL orchestration product surface built into this package. It models the Robdex-style control-plane idea as provider-neutral TypeScript state instead of depending on native Codex multi-agent feature gates.

`OpenDexControlPlane` owns:

- Projects with one authoritative orchestrator thread.
- Worker and QA sessions spawned only by that orchestrator thread.
- Per-worker task scope, owned paths, expected evidence, messages, and artifacts.
- Final worker handoffs routed into the orchestrator inbox.
- Parent-thread continuation decisions: `continue`, `approved`, and `blocked`.
- Agent archival and event history for lifecycle inspection.

This surface is intentionally separate from `multi_agent`, `multi_agent_v2`, and Codex fanout. The parent thread keeps task split, child launch, evidence merge, continuation, and final decision authority. Symphony can still run Codex app-server workers; OpenDex records the orchestration state and artifact routing around those workers.

## Runtime Contract

- Tracker support is Linear only. `tracker.kind` must be `linear`.
- The workflow path is explicit from the CLI argument, or `./WORKFLOW.md` by default.
- `WORKFLOW.md` is reloaded before ticks so future dispatch, retry, hook, prompt, and agent launches use the latest valid config.
- Invalid reloads are logged and the last valid config remains active.
- Workspaces are created under the normalized `workspace.root`; issue identifiers are sanitized before path construction.
- Existing workspace directories are reused. Existing non-directory workspace paths fail the attempt.
- `after_create` and `before_run` hook failures fail the current attempt.
- `after_run` and `before_remove` hook failures are logged or ignored and do not block cleanup.
- Codex is launched with `bash -lc <codex.command>` in the per-issue workspace.
- The Codex client uses JSONL app-server stdio with `initialize`, `initialized`, `thread/start`, `turn/start`, and `turn/completed`.
- The Codex client advertises Symphony's `linear_graphql` dynamic tool and executes calls with the configured Linear endpoint and API key.
- Unsupported app-server requests and dynamic tools are rejected so the session does not stall.
- Diagnostic stderr is kept separate from JSONL stdout.
- Successful worker exits schedule a short continuation retry. Failed exits use exponential backoff capped by `agent.max_retry_backoff_ms`.
- Upstream Symphony skills are installed through OAL source records from `third_party/openai-symphony/.codex/skills`, currently `commit`, `push`, `pull`, `land`, and `linear`.

## Trust And Safety

This package does not add a second sandbox beyond the host OS and Codex app-server settings supplied through `WORKFLOW.md`. Operators are expected to run Symphony in a trusted local environment with workspace roots, hooks, Linear credentials, and Codex authentication scoped for the project.

The implementation preserves the spec boundary: Symphony reads tracker state, schedules work, creates workspaces, launches agents, retries, reconciles, cleans terminal workspaces, and emits structured logs. Ticket writes, comments, PR links, and final state transitions remain workflow/agent responsibilities.
