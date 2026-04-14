# MicroPython `py/` Reference Baseline

Use this reference when the main skill needs a concrete example of disciplined ownership, public API shape, runtime-state ownership, or registration patterns.

This is a reference source, not a style-copying mandate.

Repo: <https://github.com/micropython/micropython/>

## Core translation rule

Borrow structural principles. Do not cargo-cult C macros, naming prefixes, or giant files into languages that already have stronger module systems and type tools.

## Why `py/` is useful

- Subsystems have obvious homes: compiler, runtime, object model, modules, state.
- Public names advertise ownership.
- Public entrypoints read like verbs, not grab-bag exports.
- Registration is often data-driven instead of branch soup.
- Shared runtime state has one owner.
- Large files still keep one dominant responsibility and stable internal grammar.

## Anchor files

### `CODECONVENTIONS.md`

Useful for naming regularity, interface discipline, and consistency pressure. Not useful as a mandate to mimic C-specific style choices in other languages.

### `py/runtime.h`

Reference for runtime-owned entrypoints and clear subsystem identity on public names.

Questions it helps answer:

- which functions belong on the runtime surface
- which helpers should stay internal
- how public entrypoints can read like verbs instead of exports-by-accident

### `py/obj.h`

Reference for object-model ownership. Useful when evaluating whether type-level behavior, shared object contracts, and public runtime types are scattered across unrelated modules.

### `py/mpstate.h`

Reference for explicit shared runtime state ownership.

Use it when a codebase has ambient mutable state leaking through globals, hidden singletons, or cross-module mutation with no owning type.

### `py/modsys.c` and `py/modbuiltins.c`

Reference for module/export wiring and table-driven registration.

Use them when repeated registration or export code wants descriptor tables or a registry shape instead of imperative chains.

### `py/compile.c`

Reference for “large file still acceptable” judgment.

Takeaway:

- large file acceptable when it owns one subsystem
- phases are internally legible
- helper naming is regular
- callers do not need global understanding for local edits

Do not keep giant files merely because `compile.c` is large.

## Language translation notes

### Rust

- Prefer module ownership plus selective public exports.
- Split broad facades by concept family.
- Prefer typed registries and const tables over imperative wiring.
- Keep one explicit runtime/session/context owner.

### TypeScript / JavaScript

- Use one `index.ts` facade per subsystem, not a dumping ground.
- Avoid `utils.ts` sinkholes.
- Prefer descriptor tables over long `switch` or `if` ladders when wiring repeats.
- Keep runtime state in explicit stores, not ambient shared objects.

### Go

- Let package names signal ownership.
- Keep exported package surface smaller than internals.
- Use typed slices/maps for handler and builtin registration.
- Centralize mutable shared state in one owning struct.

### JVM / Swift / C#

- Let namespaces/packages signal ownership.
- Expose thin public interfaces.
- Use enums, sealed hierarchies, descriptors, or registries for dispatch and registration.
- Keep context and runtime state explicit.
