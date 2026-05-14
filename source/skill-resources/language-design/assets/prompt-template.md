## Prompt Template for Language Architecture Agents

Use this when asking an agent to design or refactor a language/runtime architecture:

```md
Design this language/runtime as a strict acyclic graph of packages/modules around stable contracts. Do not assume a fixed compiler pipeline such as AST→HIR→MIR→LLVM. Select the smallest set of representations needed for the actual execution strategy: tree interpretation, checked AST interpretation, core-language lowering, bytecode VM, JIT, native backend, source emitter, hosted VM target, tooling-first incremental compiler, or a justified hybrid.

For each proposed package/module, specify:
- owned data contracts,
- algorithms implemented,
- allowed dependencies,
- forbidden dependencies,
- tests that prove the boundary,
- examples of cycle hazards avoided.

Ground design choices in established languages and systems: Ada, Rust, Pascal/Modula/Oberon, Common Lisp, Clojure, ML-family languages, Erlang/BEAM, Lua, Python, Go, Java/C#, C/C++, LLVM, Cranelift, WASM, and custom VM designs.

Explicitly cover:
- syntax pitfalls,
- semantic model,
- type system choices,
- module/package system,
- runtime strategy,
- memory management / GC style,
- FFI and ABI,
- diagnostics,
- tooling/LSP/formatter,
- versioning/evolution,
- bad designs to reject.

Do not produce placeholder architecture. Do not prescribe LLVM/HIR/MIR unless justified. Do not let runtime, compiler frontend, tools, and package manager import each other cyclically.
```

