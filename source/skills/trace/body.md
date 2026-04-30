# Tracing Workflow

## First Principle

**Trace one thing end-to-end: a symbol, dependency edge, data shape, or call path.**

## Tracing Protocol

1. **Anchor** - choose the concrete symbol, file, type, or interface being traced
2. **Find edges** - identify direct callers, callees, imports, exports, and data producers/consumers
3. **Follow impact** - map upstream dependencies and downstream effects
4. **Stop at clarity** - once the path and impact are clear, summarize instead of continuing indefinitely
5. **Report** - give the trace as an ordered path plus likely impact points

## Trace Types

| Trace      | Questions answered                                     |
| ---------- | ------------------------------------------------------ |
| Dependency | what imports this and what it imports                  |
| Call path  | who invokes this and what it invokes next              |
| Data flow  | where this value is created, transformed, and consumed |
| Impact     | what likely breaks or changes if this symbol moves     |

## Output Requirements

- Present the path in execution or dependency order
- Call out fan-out points where one change touches many consumers
- Highlight boundaries: API, schema, persistence, network, UI, background jobs
- Mark inferred impact as inferred

## Do NOT

- Collapse tracing into a vague “used in many places”
- Mix architecture opinion into a trace report
- Skip the downstream impact when the user asked about change risk
