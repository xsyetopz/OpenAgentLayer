## Design Review Checklist

### Semantics

```txt
[ ] What are the language’s core semantic values?
[ ] What is a binding?
[ ] What is a module?
[ ] What is a type?
[ ] What is runtime identity?
[ ] What is equality?
[ ] What is mutability?
[ ] What is absence/null?
[ ] What is failure?
[ ] What is resource ownership?
[ ] What is concurrency?
[ ] What is unsafe/foreign?
```

### Syntax

```txt
[ ] Are declarations readable?
[ ] Is the identifier location predictable?
[ ] Are precedence rules minimal and unsurprising?
[ ] Are dangerous operator mixes parenthesized or rejected?
[ ] Are keywords/symbols chosen by semantic weight?
[ ] Is grammar parseable with good recovery?
[ ] Can formatter preserve comments/trivia?
[ ] Are generics unambiguous?
[ ] Are annotations classified?
```

### Implementation Architecture

```txt
[ ] What are the contract boundaries?
[ ] Is the package/module/crate graph acyclic?
[ ] Are data contracts below algorithms?
[ ] Does VM/runtime avoid importing frontend?
[ ] Does compiler core avoid importing CLI/LSP?
[ ] Are diagnostics structured?
[ ] Are backend concerns isolated?
[ ] Is package resolution separate from import resolution?
[ ] Are tests organized per contract?
```

### Runtime

```txt
[ ] What is value representation?
[ ] What is memory management strategy?
[ ] What is call convention?
[ ] What is module loading model?
[ ] What is FFI policy?
[ ] What is concurrency model?
[ ] What are GC roots/safepoints?
[ ] What metadata exists at runtime?
```

### Tooling

```txt
[ ] Is parser fast enough for IDE use?
[ ] Is syntax lossless if formatter/LSP need it?
[ ] Are diagnostics stable and machine-readable?
[ ] Is formatter canonical?
[ ] Is package manager reproducible?
[ ] Is semantic index exposed?
[ ] Can docs be generated from declarations/types?
```

