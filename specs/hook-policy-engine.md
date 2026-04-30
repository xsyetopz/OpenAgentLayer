# Hook policy engine

Purpose: v4 runtime policy engine.

Authority: normative.

## Policy categories

- `session_context`
- `input_guard`
- `execution_guard`
- `output_safety`
- `completion_gate`
- `delegation`
- `vcs_gate`
- `drift_guard`
- `context_budget`

## Policy lifecycle

1. Source record defines policy intent.
2. Adapter maps intent to surface hook events.
3. Renderer emits hook config and runtime scripts.
4. Installer places managed scripts.
5. Runtime guard receives surface payload.
6. Guard returns allow, deny, warning, context, or completion block.

## Runtime script rules

- Runtime scripts are `.mjs`.
- Runtime scripts must be self-contained after install.
- Runtime scripts must tolerate missing optional context.
- Runtime scripts must fail open only when policy source marks failure as non-blocking.
- Runtime scripts must have synthetic payload tests.

## Hook policy record

Each hook policy is a source record, not a renderer string.

Fields:

- `id`: stable kebab-case policy id.
- `category`: one policy category from this spec.
- `blocking`: whether failure blocks the surface action.
- `failure_mode`: `fail_open`, `fail_closed`, or `warn_only`.
- `handler_class`: `command_script`, `prompt_review`, `agent_review`, `http_callout`, or `mcp_callout`.
- `runtime_script`: generated `.mjs` path for command-script handlers.
- `matcher`: abstract matcher expression translated per surface.
- `payload_schema`: normalized input expected by the runtime script.
- `surface_events`: adapter-resolved event list.
- `test_payloads`: synthetic payload fixtures required before release.

## Surface event mapping

Adapters map OAL policy categories to current surface mechanisms:

- Codex: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `PermissionRequest`.
- Claude Code: lifecycle, prompt, tool, permission, subagent, file, compaction, and session events from Claude hook docs.
- OpenCode: plugin events such as `tool.execute.before`, `tool.execute.after`, `permission.asked`, `session.*`, `command.executed`, `file.*`, and `tui.*`.
- `vcs_gate` maps to tool-execution hooks plus completion/session diff checks; adapters must implement both command guard and final diff-state validation where the surface can expose them.

OpenCode renders plugin handlers for hook-like policy.

## Blocking semantics

- Deterministic safety checks use `command_script`.
- Claude and Codex command hooks may block with documented surface output or exit behavior.
- OpenCode plugin guards block by throwing an error or mutating event output according to plugin event semantics.
- `fail_closed` is required for destructive command guards and secret path guards.
- `warn_only` is required for style, formatting, and non-critical drift hints.
- Prompt/agent review hooks must not be used when a pure command guard can make the decision.

## Payload adapter rules

Runtime scripts receive normalized JSON:

- `surface`
- `event`
- `policy_id`
- `cwd`
- `tool_name`
- `tool_input`
- `command`
- `paths`
- `route`
- `metadata`

Each surface adapter owns conversion from native payload to normalized payload. Runtime scripts must not parse native surface payloads directly unless the adapter is the runtime script.

Current runtime package exports:

- `RuntimePayload`
- `RuntimeDecision`
- `evaluateCompletionGate(payload)`
- `evaluateDestructiveCommandGuard(payload)`
- `evaluatePromptContextInjection(payload)`
- `evaluateSourceDriftGuard(payload)`
- `evaluateRuntimePolicy(payload)`
- `renderRuntimeScript(policyId)`

Runtime package internals are split by responsibility. The public API remains exported from `@openagentlayer/runtime`; internal modules own payload extraction, policy routing, individual policy evaluators, runtime script lookup, and synthetic payload creation separately.

Rendered runtime scripts are self-contained `.mjs` files. They read normalized JSON from stdin, write a normalized decision JSON line to stdout, and exit non-zero only for `deny`.

## Required guards

- destructive shell command guard;
- RTK enforcement guard where RTK policy exists;
- route contract completion guard;
- prompt/context injection guard;
- generated drift guard;
- secret path guard;
- placeholder/prototype guard for gated routes.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
