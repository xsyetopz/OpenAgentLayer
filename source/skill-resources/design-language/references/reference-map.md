## Reference Map

Use these references as design anchors. Do not copy designs blindly.

### Compiler/Interpreter Construction

- [Crafting Interpreters](https://craftinginterpreters.com/), Robert Nystrom — tree-walk interpreter and bytecode VM design-architecture
- [LLVM Kaleidoscope tutorial](https://llvm.org/docs/tutorial/) — implementing a frontend using LLVM
- [rustc dev guide, query system](https://rustc-dev-guide.rust-lang.org/query.html) — demand-driven compilation
- [rustc dev guide, HIR](https://rustc-dev-guide.rust-lang.org/hir.html)
- [rustc dev guide, MIR](https://rustc-dev-guide.rust-lang.org/mir/index.html)
- [Cranelift](https://cranelift.dev/) — frontend-generated IR compiled to machine code by an embeddable backend
- [WebAssembly Core Specification](https://www.w3.org/TR/wasm-core-2/) — portable stack-machine execution format

### Garbage Collection / Memory Management

- [Go GC guide](https://go.dev/doc/gc-guide) — concurrent mark-sweep GC and application cost model
- [Immix paper](https://www.steveblackburn.org/pubs/papers/immix-pldi-2008.pdf) — mark-region GC with opportunistic defragmentation
- [Memory Management Reference](https://www.memorymanagement.org/)

### Established Language Lessons

- [AdaCore Ada overview](https://www.adacore.com/languages/ada) — strong typing, contracts, readability, audit-safety
- [AdaCore Learn Ada](https://learn.adacore.com/courses/intro-to-ada/chapters/introduction.html) — Ada philosophy/readability/strong typing
- [Rust Book, ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)
- [Common Lisp HyperSpec, condition system](https://www.lispworks.com/write-docs/HyperSpec/Body/09_a.htm)
- [Common Lisp HyperSpec, restarts](https://www.lispworks.com/write-docs/HyperSpec/Body/09_adb.htm)
- [Common Lisp HyperSpec, standard-class/CLOS references](https://www.lispworks.com/write-docs/HyperSpec/Body/t_std_cl.htm)
- [Clojure atoms](https://clojure.org/reference/atoms)
- [Clojure agents](https://clojure.org/reference/agents)
- [Niklaus Wirth, recollections on Pascal](https://pascal.hansotten.com/niklaus-wirth/recollections-about-the-development-of-pascal/)
- [ETH Zurich Pascal retrospective](https://inf.ethz.ch/news-and-events/spotlights/infk-news-channel/2021/04/niklaus-wirth-pascal-conquers-the-world.html)
- [Dennis Ritchie, The Development of the C Language](https://www.nokia.com/bell-labs/about/dennis-m-ritchie/chist.pdf)

### Useful Books / Papers To Consult

- Aho, Lam, Sethi, Ullman — Compilers: Principles, Techniques, and Tools.
- Appel — Modern Compiler Implementation.
- Muchnick — Advanced Compiler Design and Implementation.
- Pierce — Types and Programming Languages.
- Harper — Practical Foundations for Programming Languages.
- Jones, Hosking, Moss — The Garbage Collection Handbook.
- Queinnec — Lisp in Small Pieces.
- Graham — On Lisp.
- Seibel — Practical Common Lisp.
- Abelson/Sussman — Structure and Interpretation of Computer Programs.
- Wirth — Compiler Construction.
- Dybvig — The Scheme Programming Language.
- Armstrong — Programming Erlang.

