# Structural Refactor Moves

Use these moves when applying the `elegance` skill to real code.

## Split triggers

Split when a file or module owns unrelated work such as:

- parsing + diagnostics + lowering
- schema + runtime behavior + validation
- dependency resolution + IO + execution
- symbol loading + marshalling + call execution

## Safe split sequence

1. Identify the dominant subsystem invariant.
2. Group code into concept families that change together.
3. Extract siblings around those families.
4. Keep one thin facade at the subsystem root.
5. Preserve behavior and public contract.
6. Add or update boundary tests around moved seams.

## Registration cleanup

When repetitive wiring appears:

- extract a descriptor or metadata table
- centralize lookup/dispatch through one typed path
- keep validation near descriptor construction
- avoid giant `switch` chains that duplicate metadata

## Naming cleanup

Replace generic names with owner-revealing names.

```diff
- type Manager struct
- class DataHelper {}
- function handleThing(value) {}
+ type SessionStore struct
+ class ModuleRegistry {}
+ function routeCommand(command) {}
```

## Public API cleanup

Good target shape:

- one subsystem root
- a small exported facade
- deeper implementation modules hidden unless intentionally public

Warning signs:

- callers import internals from many places
- top-level module re-exports everything
- public surface grows faster than real usage
