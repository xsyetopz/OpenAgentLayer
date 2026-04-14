# Structural Elegance

Use this skill when code needs tighter ownership, narrower APIs, cleaner naming, and less junk-drawer architecture.

## Core Rule

Optimize for:

1. obvious ownership
2. narrow public surface
3. predictable names
4. data-driven wiring where repetition exists
5. explicit shared state

Port principles, not syntax.

## Use When

- a subsystem boundary feels blurred
- a public module exports inventory instead of intent
- names hide the owner or responsibility
- registration code sprawls into branch soup
- runtime or session state leaks across unrelated files
- a large file might still be salvageable if its internal grammar is clean

## Ownership-First Naming

- Public symbols should advertise the subsystem or owning concept.
- Avoid generic names like `Manager`, `Helper`, `Utils`, `Common`, `Thing`.
- Prefer names that answer “who owns this?”

```text
Good: RuntimeHandlers, SurfaceTypeStore, ProjectWorkspaceGraph, BytecodeEmitter, ModuleRegistry
Bad:  Helpers, DataManager, SharedUtils
```

If package or module ownership already makes the name obvious, do not invent extra prefixes.

## Thin Public Surface

- Keep public API smaller than implementation.
- Expose one thin facade per subsystem.
- Re-export only stable, intentional surface.
- If callers use only a small slice of exported items, surface too wide.

When reviewing, call out public modules that read like inventory dumps.

## One Concept Family per File Cluster

Prefer:

- one subsystem root
- several sibling files for concept families
- one thin facade

Avoid:

- god files mixing parsing, normalization, checking, lowering, diagnostics, and registration
- `misc`, `other`, or generic sink modules

Split by responsibility, not arbitrary line count.

## Data-Driven Wiring

If code repeats builtin registration, handler lookup, command routing, export wiring, or metadata declarations, prefer tables, descriptors, registries, or typed maps over long imperative chains.

Translate by host language:

- Rust: const tables, enums, builders, typed registries
- TypeScript/JavaScript: descriptor objects, arrays of descriptors, explicit registries
- Go: typed slices/maps and package-level registries
- JVM/Swift/C#: enums, sealed hierarchies, descriptors, static registries

Do not replace useful types with stringly registries for aesthetics.

## Shared State Ownership

- One runtime, session, or context owner per logical state domain.
- Access shared mutable state through a clear API.
- If several files mutate the same logical state without one owning type, architecture rotting.

Hidden ambient mutable state is a design smell even when the code still “works”.

## Large File Rule

A large file is acceptable only when all of these hold:

- it owns one major subsystem
- internal sections follow stable phases or concept families
- helper naming is regular
- callers can change one part without understanding the whole file

Otherwise split it.

## Review Checklist

Ask these in order:

1. Which subsystem owns this behavior?
2. Does the file or module name reveal ownership?
3. Is the public surface smaller and cleaner than the implementation?
4. Is repeated wiring encoded as data?
5. Is shared state centralized?
6. Is this file large because of one responsibility or because nobody said no?

## Refactor Heuristics

Split when one file or module owns 3+ unrelated responsibilities, especially mixes like:

- collection + normalization + checking
- schema + runtime behavior + diagnostics
- dependency resolution + IO + compile entrypoints
- ABI modeling + symbol loading + marshalling + call execution

Keep pieces together when they are phase-coupled and share one dominant invariant.

Default move:

- split by concept family
- create a thin facade
- preserve exact behavior
- add tests around moved boundaries

## Anti-Patterns

- giant `api.rs` or `lib.rs` export troughs
- `project.rs`, `runtime.rs`, `checker.rs`, `manager.ts`, or similar files absorbing everything
- generic helper sinks
- names that hide the owner
- repeated imperative registration code
- cross-module mutable state with no single owner

## Output Discipline

When using this skill for review or planning:

- state current ownership shape first
- cite exact file paths
- name god files directly
- recommend structural splits by responsibility, not arbitrary size
- distinguish confirmed code facts from architectural inference

## Further Reference

For a concrete baseline that inspired these rules, see `reference/micropython-py.md`.

External source: <https://github.com/micropython/micropython/>
