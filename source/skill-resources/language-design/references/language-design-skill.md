# Language Design, Compiler Architecture, Runtime Architecture, and Semantic Discipline Skill

Use this skill when designing, reviewing, implementing, or refactoring a programming language, compiler, interpreter, VM, runtime, standard library, package/module system, language server, formatter, transpiler, or execution backend.

This skill is intentionally architecture-first. Do not assume every language is a native compiler. Do not assume every language has HIR/MIR/LLVM. Do not assume every language is interpreted. Choose contracts, representations, and runtime strategy from the language’s actual goals.

## Core Outcome

Produce language/runtime designs that are:

- semantically explicit,
- implementation-realistic,
- acyclic by package/module/crate dependency,
- testable without whole-system coupling,
- honest about runtime/execution tradeoffs,
- informed by established languages,
- resistant to bad syntax/semantic inheritance,
- practical for compilers, interpreters, VMs, LSPs, and package managers.

Do not design by fashion. Learn from old and current systems: Ada, Rust, Pascal/Modula/Oberon, Common Lisp, Clojure, ML-family languages, Smalltalk, Erlang/BEAM, Lua, Python, Java, C#, Go, Swift, Kotlin, JavaScript, TypeScript, C, C++, Zig, D, Nim, Julia, Racket, Forth, Prolog, WASM, LLVM, Cranelift, QBE, and custom VMs.

## Non-Negotiable Design Rule

A language implementation is a DAG of contracts.

The exact contracts vary:

- tokens,
- syntax tree,
- typed AST,
- core AST,
- symbol graph,
- semantic index,
- bytecode,
- VM module format,
- custom IR,
- SSA IR,
- LLVM IR,
- Cranelift IR,
- target source AST,
- runtime ABI,
- package graph,
- diagnostic data,
- LSP-facing semantic database.

The names do not matter. The ownership boundaries matter.

Use this shape:

```txt
producer → contract ← consumer
```

Examples:

```txt
parser → AST ← resolver/checker/interpreter
checker → typed AST ← codegen/interpreter
compiler → bytecode ← VM
compiler → runtime ABI ← runtime
frontend → target-source AST ← emitter
compiler core → diagnostic data ← terminal/LSP/JSON renderers
compiler services → semantic index ← LSP/formatter/docs
```

Never let implementation layers import each other cyclically.

## Universal DAG Rules

```txt
1. Stable data contracts live below algorithms.
2. Algorithms depend on contracts, not vice versa.
3. Drivers orchestrate phases; phases do not import drivers.
4. Tools adapt compiler services; compiler core does not import tools.
5. Backends consume explicit contracts; frontends do not store backend objects.
6. Runtime services expose ABI/metadata contracts; compilers target those contracts.
7. Syntax must not depend on execution strategy.
8. VM/runtime should not import parser/compiler frontend.
9. Diagnostics are structured data in core and rendered outside core.
10. Package/crate/module boundaries must enforce the DAG.
```

Bad:

```txt
AST nodes own eval() and codegen() methods.
Type model imports typechecker.
Bytecode format imports bytecode compiler.
VM imports parser.
Runtime imports compiler driver.
Compiler core imports CLI.
LSP protocol types leak into compiler core.
Backend-specific objects appear in parser/typechecker.
Formatter depends on full runtime.
Package manager is imported by semantic checker.
Diagnostics renderer is imported by checker instead of diagnostics data.
```

Better:

```txt
AST is inert syntax data.
Interpreter/codegen walks AST externally.
Type model is data.
Typechecker is algorithm over type model.
Bytecode format is contract.
Compiler emits it.
VM consumes it.
Compiler core emits structured diagnostics.
Renderers display diagnostics.
Driver orchestrates phases.
Phases do not import driver.
Backends consume explicit contracts.
Frontend does not store backend objects.
Runtime exposes ABI/metadata contracts.
Compiler targets those contracts.
```

## Choose an Implementation Family, Not a Fashionable Pipeline

Do not force every language into `AST → HIR → MIR → LLVM`. That is only one family.

Common families:

```txt
1. Direct tree-walk interpreter
2. AST + resolver/checker + interpreter
3. Surface syntax → core language → interpreter/compiler
4. Bytecode compiler + custom VM
5. Bytecode VM + optional JIT
6. Native compiler via LLVM/Cranelift/QBE/etc.
7. Direct LLVM/Cranelift frontend
8. Custom native backend
9. Source-to-source compiler / transpiler
10. Hosted language on JVM/.NET/BEAM/JS/Lua/etc.
11. Tooling-first incremental compiler
12. Macro/metaprogramming-heavy language
13. REPL/notebook/live runtime language
14. DSL embedded in an existing host language
15. Declarative/logic/query language runtime
```

The correct architecture is the smallest set of contracts that preserves semantic clarity, testability, and evolution.

## Generic Layer Model

Not every project has every layer. Some collapse. Dependency direction still matters.

```txt
layer 0: foundation
  spans, source IDs, diagnostics data, symbols, interning, IDs, arenas

layer 1: input/syntax
  lexer, parser, syntax tree, token tree, lossless tree

layer 2: language meaning
  resolver, scope model, type/effect/capability model, semantic declarations

layer 3: execution contract
  typed AST, core AST, bytecode, custom IR, LLVM IR builder boundary,
  target source AST, VM module format, runtime ABI

layer 4: execution implementation
  interpreter, VM, JIT, native codegen, transpiler emitter, host VM emitter

layer 5: runtime services
  object model, memory management, loader, FFI, scheduler, exceptions,
  stdlib hooks, reflection metadata

layer 6: orchestration/tools
  compiler driver, CLI, REPL, LSP, formatter, package manager, build system,
  test runner, doc generator
```

Valid collapsed examples:

```txt
small interpreter:
  foundation → parser/AST → interpreter/runtime → CLI

direct LLVM compiler:
  foundation → parser/AST → checker → LLVM codegen → driver

bytecode language:
  foundation → parser/checker → bytecode-format → VM/runtime → CLI

transpiler:
  foundation → parser/checker → target emitter → CLI

tooling-first:
  foundation → lossless syntax → semantic queries → LSP/CLI
```

## Architecture Families

### 1. Direct Tree-Walk Interpreter

Shape:

```txt
source → lexer/parser → AST → interpreter
```

Use for:

- small scripting languages,
- config languages,
- embedded DSLs,
- educational languages,
- first implementations where compile speed and simplicity matter more than runtime speed.

Modules/packages:

```txt
source
spans
diagnostics
lexer
parser
ast
runtime-values
environment
interpreter
stdlib
repl
cli
```

Rules:

```txt
parser → ast
interpreter → ast + runtime-values
ast → foundation only
cli/repl → interpreter
```

Avoid:

```txt
ast → interpreter
parser → runtime-values
runtime-values → parser
```

Design lesson:

- This is simple, but AST evaluation tends to make syntax and execution semantics too close.
- Use it knowingly. Do not accidentally make syntax the permanent semantic core.

### 2. AST + Semantic Interpreter

Shape:

```txt
source → AST → resolver/checker → interpreter
```

Use when:

- names/scopes/types need precomputation,
- error messages matter,
- runtime should not redo resolution,
- the language remains mostly AST-executable.

Modules:

```txt
ast
symbols
scope-model
resolver
type-model
checker
runtime-values
interpreter
```

Rules:

```txt
resolver/checker → ast + symbols + type-model
interpreter → ast + resolved metadata + runtime-values
```

Good pattern:

```txt
ExprId -> SymbolId
ExprId -> TypeId
NodeId -> SourceSpan
```

Do not store typechecker-owned objects inside AST nodes.

### 3. Surface Syntax → Core Language

Shape:

```txt
surface AST → desugar/lower → core AST → checker/interpreter/compiler
```

Use for:

- Lisp/Scheme/Racket-like languages,
- ML-family languages,
- languages with rich surface sugar,
- macro-heavy languages,
- languages where the semantics are intentionally smaller than the syntax.

Modules:

```txt
surface-syntax
surface-ast
macro/token-tree
core-ast
desugar
resolver
checker
core-interpreter
core-compiler
```

Rules:

```txt
desugar → surface-ast + core-ast
checker → core-ast
interpreter/compiler → core-ast
```

Design lesson:

- A small semantic core makes a rich language implementable.
- Do not make every syntax form primitive.
- Do not let macros bypass hygiene, scope, or phase separation.

### 4. Bytecode Compiler + VM

Shape:

```txt
source → parser/checker → bytecode compiler → bytecode → VM
```

Modules:

```txt
bytecode-format
bytecode-builder
bytecode-decoder
bytecode-verifier
constant-pool
vm-core
vm-stack-or-registers
vm-objects
vm-runtime
vm-stdlib
vm-loader
vm-debug
```

Rules:

```txt
compiler → bytecode-format ← vm
compiler → bytecode-builder
vm → bytecode-format
```

Avoid:

```txt
vm → parser
vm → checker
bytecode-format → compiler
```

Design lesson:

- Bytecode is a contract. Treat it like a public ABI even if internal.
- Version it if serialized.
- Verify it if untrusted or user-loadable.
- Make debug metadata explicit.

### 5. Bytecode VM + Optional JIT

Shape:

```txt
source → bytecode → interpreter → profiling → JIT IR/machine code
```

Modules:

```txt
bytecode-format
vm-core
interpreter
runtime-objects
inline-cache
profiler
jit-ir
jit-compiler
deoptimizer
gc
platform
```

Rules:

```txt
jit → bytecode + vm-runtime + jit-ir
frontend → bytecode-format
frontend does not depend on jit
```

Design lesson:

- A JIT is an execution optimization layer, not the semantic owner of the language.
- If optimization changes semantics, the language is broken.
- Deoptimization, stack maps, safepoints, and GC visibility must be designed early.

### 6. Native Compiler via LLVM/Cranelift/QBE/Custom Backend

Shape:

```txt
source → frontend → semantic representation → backend lowering → native/object/WASM
```

Modules:

```txt
semantic-model
backend-contract
target-model
abi-layout
codegen-core
codegen-llvm
codegen-cranelift
codegen-qbe
codegen-custom
linker-driver
runtime-abi
```

Rules:

```txt
codegen-llvm → backend-contract + llvm-bindings
codegen-cranelift → backend-contract + cranelift-bindings
frontend → semantic-model
frontend should not import llvm/cranelift directly
```

Bad:

```txt
typechecker emits LLVM values
parser branches on Cranelift backend details
semantic model stores LLVM objects
```

Better:

```txt
frontend → semantic representation → backend adapter → LLVM/Cranelift/QBE/custom
```

Design lesson:

- LLVM/Cranelift are backend technologies, not language designs.
- Do not let backend affordances dictate source semantics unless that is an explicit goal.

### 7. Source-to-Source Compiler / Transpiler

Shape:

```txt
source language → parser/checker → target source emitter → C/JS/Lua/Python/etc.
```

Modules:

```txt
source-ast
resolver
checker
target-model
target-name-mangling
target-runtime-shim
target-source-ast
target-emitter
source-map
```

Rules:

```txt
emitter → target-source-ast + semantic model
frontend does not depend on emitter
```

Avoid:

```txt
parser has JS mode
resolver knows C identifier escaping
checker imports Python emitter
```

Design lesson:

- Target-specific hacks belong in target lowering/emission.
- If target limitations affect semantics, model them as target capabilities.

### 8. Hosted VM Language

Shape:

```txt
source → frontend → host VM contract → JVM/.NET/BEAM/JS/Lua/etc.
```

Modules:

```txt
frontend
semantic-model
host-type-model
host-abi
host-bytecode-emitter
host-interop
host-stdlib-bridge
```

Rules:

```txt
host emitter → semantic model + host contract
semantic model should not depend on host runtime unless language is explicitly host-native
```

Design lesson:

- Be honest: is the host VM an implementation detail or part of the language identity?
- Clojure embraces the host. That is different from pretending the host is invisible.

### 9. Tooling-First Incremental Compiler

Shape:

```txt
source snapshots → incremental parse → semantic queries → diagnostics/completion/rename/format/build
```

Modules:

```txt
source-db
lossless-syntax
parser
incremental-query-db
symbol-index
semantic-index
diagnostics
completion
rename
formatter
lsp-adapter
compiler-driver
```

Rules:

```txt
lsp-adapter → compiler-service-api
cli → compiler-service-api
compiler-service-api → query-db
query implementations → syntax/semantics
```

Avoid:

```txt
compiler core imports LSP protocol types
parser imports editor state
```

Design lesson:

- If tooling is first-class, lossless syntax and incremental semantic queries are not optional niceties.
- But LSP must remain an adapter, not the compiler’s internal API.

## Established Language Lessons

### Ada

Learn from Ada:

- readability over terseness,
- strong typing as error prevention,
- named parameters and clear call sites,
- ranges and constraints as part of the type/story,
- packages/specifications as modular contracts,
- tasking/concurrency as language-level design, not only library folklore,
- contracts/preconditions/postconditions as executable design intent,
- safety-critical culture around predictability.

Important design takeaways:

```txt
Use explicit names when symbols would hide meaning.
Prefer domain-specific types over aliases of primitive soup.
Make illegal states hard to express.
Make module boundaries contractual.
Do not worship brevity if it damages auditability.
```

Bad C-style habit Ada avoids:

```c
typedef int Port;
typedef int UserId;
void open(Port p, UserId u); // still just ints semantically
```

Better language-design direction:

```txt
type Port is range 0 .. 65535
type User_Id is private
procedure Open(P : Port; U : User_Id)
```

Even if your syntax is not Ada-like, the principle holds: make domain meaning visible in the type system.

### Rust

Learn from Rust:

- ownership and borrowing can encode memory discipline without GC,
- affine/linear-ish resource ownership improves API design,
- pattern matching plus enums/sum types are a major semantic win,
- trait coherence matters,
- explicit error handling avoids invisible control flow,
- package tooling and edition mechanisms matter as much as syntax,
- diagnostics can become part of language adoption.

Design takeaways:

```txt
Memory/resource policy is language design, not merely runtime design.
If borrowing exists, design around lifetimes/regions/reborrowing from day one.
If traits/protocols/typeclasses exist, design coherence/orphan rules early.
Use sum types for domain alternatives, not sentinel values.
Avoid implicit global conversions that make APIs locally unreadable.
```

Borrow-checker lesson:

```txt
A difficult constraint can be acceptable if the language gives precise diagnostics,
clear escape hatches, and strong payoff.
```

Do not cargo-cult Rust:

```txt
Do not add ownership because Rust has it.
Add ownership if your language's domain requires deterministic resource safety,
no GC, predictable performance, or strong aliasing control.
```

### Pascal, Modula, Oberon, and Wirth-style Systems

Learn from Pascal-family systems:

- structured programming was a semantic simplification, not just syntax,
- declarations and type definitions should make program structure visible,
- small languages can be teachable and implementable,
- compiler simplicity is a design virtue,
- module systems are more important than clever expression syntax.

Design takeaways:

```txt
Prefer regular grammar and predictable declarations.
Make block structure obvious.
Make teaching/readability a legitimate design goal.
Keep the implementation model explainable.
Do not make every feature interact with every other feature.
```

But also learn Pascal’s failures:

- overly rigid array/string types damaged library writing,
- incomplete standard library/ecosystem support matters,
- evaluation-order ambiguities are not harmless,
- language purity that prevents practical reusable components fails users.

Rule:

```txt
Small and structured is good.
Small and underpowered is not.
```

### Common Lisp

Learn from Common Lisp:

- interactive development can be a first-class design goal,
- conditions/restarts are more powerful than simple exceptions,
- macros can extend the language if hygiene/phase/design discipline are handled,
- generic functions and multiple dispatch are different from class-owned methods,
- the image/runtime/debugger can be part of the development model,
- standardization can preserve a large language ecosystem.

Condition/restart lesson:

```txt
Error handling does not have to mean stack unwinding only.
A program can signal a condition while offering structured recovery options.
```

CLOS lesson:

```txt
Object systems do not have to mean class-owned single-dispatch methods.
Generic functions and multiple dispatch may better model operations that cross types.
```

Macro lesson:

```txt
Macros are language power tools.
Without hygiene, phase separation, and style conventions, they become semantic landmines.
```

Do not cargo-cult Lisp:

```txt
Do not add macros because Lisp has macros.
Add macros if users need controlled extension of syntax/semantics,
and you can enforce hygiene, expansion diagnostics, and tooling support.
```

### Clojure

Learn from Clojure:

- persistent immutable data structures are a language-level simplifier,
- identity/state/value separation is extremely important,
- host interop can be embraced rather than hidden,
- small core + rich libraries can work if abstractions are stable,
- reference types can encode different state/concurrency semantics.

Clojure state model lessons:

```txt
Atom: independent synchronous state.
Ref: coordinated synchronous state.
Agent: independent asynchronous state.
Var: dynamic/thread-local-ish binding and namespace-level identity.
```

Design takeaway:

```txt
Do not expose one generic "mutable variable" if the language actually has
several distinct state/concurrency semantics.
```

Clojure host lesson:

```txt
If your language runs on an existing platform, decide whether host interop is explicit,
idiomatic, and stable—or a leaky accident.
```

### ML / OCaml / Standard ML / F#

Learn from ML-family languages:

- algebraic data types are foundational,
- pattern matching is not syntactic sugar; it is semantic structure,
- Hindley-Milner style inference can be powerful when constrained,
- modules/functors show that module systems can be typed and expressive,
- exhaustiveness checking changes how APIs are designed.

Design takeaways:

```txt
Use sum/product types instead of nullable/sentinel encodings.
Treat exhaustiveness as a correctness feature.
Separate type inference from implicit magic.
Keep inference predictable and explainable.
```

### Smalltalk

Learn from Smalltalk:

- uniform object/message semantics can make a system coherent,
- live images and browsers change development style,
- message syntax can be minimal yet expressive,
- everything-is-an-object has costs and benefits.

Design takeaway:

```txt
Uniformity is valuable when it reduces concepts.
Uniformity is harmful when it hides performance, representation, or failure modes.
```

### Erlang / BEAM

Learn from Erlang/BEAM:

- failure semantics can be architectural,
- lightweight processes and message passing shape the language,
- hot code loading and supervision are runtime/language ecosystem decisions,
- immutable data plus process isolation simplifies concurrency reasoning.

Design takeaway:

```txt
Concurrency semantics should be designed, not retrofitted through threads and locks only.
```

### Lua

Learn from Lua:

- small embeddable runtimes can be enormously successful,
- tables as the central abstraction reduce runtime concepts,
- C API/embedding story is part of language design,
- metatables are powerful but can obscure semantics.

Design takeaway:

```txt
Embedding API is a language/runtime contract, not an afterthought.
```

### Python

Learn from Python:

- readability and batteries-included libraries drive adoption,
- indentation can encode block structure effectively,
- dynamic semantics can coexist with gradual typing, but retrofitting is hard,
- packaging complexity can damage user experience even when the language is loved.

Design takeaway:

```txt
Syntax readability is not enough; packaging, environments, versioning, and tooling are language UX.
```

### Java / C# / Kotlin / Swift

Learn from managed mainstream languages:

- stable runtimes and standard libraries matter,
- generics design has long-term consequences,
- nullability retrofit is painful,
- async/await colors APIs if not carefully designed,
- binary compatibility and package ecosystem stability become language constraints.

Design takeaway:

```txt
Once a language has libraries, compatibility becomes a semantic constraint.
```

### Go

Learn from Go:

- simple syntax plus strong tooling can win,
- fast compilation matters,
- interfaces can be structural and implicit,
- concurrency primitives can become a cultural model,
- minimalism is powerful but can become under-abstraction.

Design takeaway:

```txt
Tooling, formatting, testing, package layout, and compiler speed can be language features.
```

### C and C++

Learn from C:

- small low-level languages can dominate when they map well to machines,
- undefined behavior enables optimization but damages reasoning,
- declaration syntax can become permanently painful,
- operator precedence mistakes become decades-long hazards,
- implicit conversions and integer promotions are semantic traps,
- header/textual inclusion models scale poorly.

Learn from C++:

- compatibility accretion can produce enormous complexity,
- zero-cost abstraction is powerful but hard to specify,
- templates/metaprogramming need diagnostics and constraints,
- resource acquisition patterns can encode safety,
- too many initialization forms harm learnability and tooling.

Design takeaway:

```txt
Do not inherit C syntax blindly.
C's success does not mean every C design choice was good.
```

## Bad Design Lessons and Avoidance Rules

### C Type-Before-Identifier Declarations

Problem:

```c
unsigned long long *(*f[10])(char const *, int);
```

The identifier is buried. The declaration mirrors expression grammar more than human reading order.

Better direction:

```txt
let f: Array<10, Pointer<Function(ConstPointer<Char>, Int) -> Pointer<UInt64>>>
```

Or language-specific readable syntax:

```txt
f: [10]*fn(*const Char, Int) -> *UInt64
```

Rule:

```txt
Put the name in a predictable place.
Put the type in a predictable place.
Avoid syntax where users must parse inside-out spirals.
```

### `unsigned long long` and Modifier Soup

Problem:

```c
unsigned long long int
long double
short int
signed char
```

This is historical modifier composition, not a clean type algebra.

Better:

```txt
u64
i64
f64
usize
isize
```

Or domain types:

```txt
ByteCount
Port
UserId
Timestamp
```

Rule:

```txt
Primitive numeric names should be canonical, finite, and explicit.
Do not make users compose machine types through adjective soup.
```

### Operator Precedence Hazards

Problem:

```c
if (flags & MASK == 0) { ... }
```

Many users expect `flags & MASK` first. C parses comparison before bitwise AND.

Avoid designing precedence tables that require memorization.

Better options:

```txt
Require parentheses for mixed precedence groups.
Use named operations for rarely mixed bitwise/logical comparisons.
Keep comparison, boolean, bitwise, and pipeline precedence boring and documented.
```

Rule:

```txt
If a precedence rule surprises experienced users, the language is wrong or the syntax must require parentheses.
```

### Implicit Numeric Conversions

Problem:

```txt
Small integer types silently promote.
Signed/unsigned comparisons surprise users.
Overflow behavior differs by context/language/build mode.
```

Better:

```txt
No implicit narrowing.
Explicit widening rules only where always safe.
Overflow policy is explicit: checked, wrapping, saturating, trapping, or undefined-never.
```

Rule:

```txt
Numeric conversion must be locally visible or mathematically lossless.
```

### Null as a Universal Sentinel

Problem:

```txt
null can mean absent, failed, uninitialized, cleared, unknown, default, or bug.
```

Better:

```txt
Option<T>
Result<T, E>
Maybe<T>
Nullable<T> only as an explicit type constructor
```

Rule:

```txt
Absence is a type-level fact, not a universal inhabitant of all references.
```

### Exceptions as Invisible Control Flow

Problem:

```txt
Function signatures hide failure modes.
Callers cannot see what must be recovered.
Resource cleanup becomes implicit.
```

Better options:

```txt
Result-returning APIs
checked effects
condition/restart systems
typed exceptions
explicit throws clauses
panic/bug channel separated from recoverable error channel
```

Rule:

```txt
Separate bugs, panics, cancellation, recoverable errors, and external failures.
```

### Boolean Parameter Blindness

Problem:

```txt
open(path, true, false)
render(node, false)
connect(host, true)
```

Better:

```txt
open(path, mode: Create, overwrite: No)
render(node, includeHidden: false)
connect(host, tls: Enabled)
```

Rule:

```txt
If a literal argument is not self-explanatory, require labels, enums, or option records.
```

### Overloaded Syntax With Too Many Meanings

Problem:

```txt
* pointer declaration
* dereference
* multiplication
& address-of
& bitwise and
&& logical and
< generic argument / less-than / XML-ish syntax
```

Rule:

```txt
Overload syntax only when the meanings share a clear mental model.
Otherwise choose different tokens or require context that tooling can explain.
```

### Statement/Expression Inconsistency

Problem:

```txt
Some constructs return values, others don't, with arbitrary rules.
Blocks may or may not be expressions.
Control flow may or may not compose.
```

Better:

```txt
Define expression/statement boundary explicitly.
If blocks are expressions, specify tail expression rules.
If statements exist, explain why and where values are prohibited.
```

Rule:

```txt
Composition rules are language semantics, not parser trivia.
```

### Evaluation Order Ambiguity

Problem:

```txt
f(g(), h())
```

If order is unspecified, side effects become traps.

Rule:

```txt
Specify evaluation order unless there is a compelling optimization reason not to.
If unspecified, prohibit side-effect-dependent reliance or warn aggressively.
```

### Overpowerful Implicitness

Bad implicit systems:

```txt
implicit imports
implicit conversions
implicit receiver lookup
implicit nullability
implicit async scheduling
implicit global state
implicit macro expansion with hidden bindings
```

Rule:

```txt
Implicitness must reduce noise without hiding semantics.
If users cannot predict what code means locally, the implicit feature is too powerful.
```

## Syntax Design Principles

### Names and Types

Good defaults:

```txt
name: Type
fn name(param: Type) -> Return
let name: Type = value
const name: Type = value
```

Advantages:

- identifier location is stable,
- type annotation is regular,
- parsing is easier,
- error messages are cleaner,
- generic types compose naturally.

If using type-before-name, provide a strong reason.

### Keywords vs Symbols

Ada teaches that keywords can improve auditability. C-family languages teach that symbols can be compact. Lisp teaches that uniform forms reduce grammar complexity.

Rule:

```txt
Use symbols for frequent algebraic/compositional operations.
Use words for control, effects, declarations, and operations where auditability matters.
```

Bad:

```txt
Three obscure symbols for ownership, effects, and error propagation with no visual mnemonic.
```

Good:

```txt
Readable keywords for rare or semantically heavy constructs.
```

### Blocks and Delimiters

Options:

```txt
braces: { ... }
keywords: begin ... end
indentation: Python/Haskell-like
s-expressions: (...)
```

Tradeoffs:

```txt
braces: familiar, compact, noisy
begin/end: readable, verbose, good for auditability
indentation: clean, whitespace-sensitive tooling burden
s-expressions: uniform AST, unusual for many users
```

Rule:

```txt
Choose block syntax based on tooling, audience, and semantic model—not trend.
```

### Operator Set

Use a small, coherent operator set.

Avoid:

```txt
many operators with tiny precedence differences
operators that are impossible to search
ASCII art that requires a legend
reuse of one token for unrelated concepts
```

Prefer:

```txt
clear precedence groups
mandatory parentheses across dangerous groups
named functions for rare operations
operator declarations only with strict rules
```

### Generics Syntax

Common options:

```txt
Foo<T>
Foo[T]
Foo T
∀T. Foo<T>
```

Problem:

```txt
< > conflicts with comparison and shift tokens in many grammars.
```

Design rule:

```txt
Pick generics syntax early. Ensure parser, formatter, diagnostics, and nested generics are sane.
```

### Attributes / Annotations

Attributes should be semantically classified:

```txt
representation/layout
foreign/ABI
optimization hint
safety contract
tool/lint control
conditional compilation
documentation metadata
reflection metadata
codegen directive
```

Rule:

```txt
Do not create a dumping ground annotation system where arbitrary strings control semantics invisibly.
```

Attributes that affect type checking or codegen must be part of the semantic model, not late text hacks.

## Type System Design

### Type System Questions

Before designing syntax, answer:

```txt
Is the language statically typed, dynamically typed, gradually typed, or hybrid?
Are types erased, reified, or partially reified?
Does type checking happen before execution, during execution, or both?
Are generics monomorphized, boxed, dictionary-passed, reified, or erased?
Are interfaces nominal, structural, or both?
Are effects tracked?
Is nullability explicit?
Are resources affine/linear/owned?
Are capabilities/security permissions typed?
Are numeric units/domain types first-class?
```

### Nominal vs Structural Typing

Nominal:

```txt
Type identity comes from declaration.
Good for API stability, domain modeling, sealed invariants.
```

Structural:

```txt
Type compatibility comes from shape.
Good for scripting, data interop, flexible protocols.
```

Hybrid:

```txt
Nominal classes/data types plus structural interfaces/records.
```

Rule:

```txt
Do not mix nominal and structural rules casually. Specify identity, coherence, and error messages precisely.
```

### Sum Types and Pattern Matching

Prefer:

```txt
Option<T> = Some(T) | None
Result<T, E> = Ok(T) | Err(E)
Expr = Literal(Value) | Binary(Expr, Op, Expr) | Call(Expr, Args)
```

Over:

```txt
nullable pointers
integer tag fields
stringly typed variants
sentinel return values
```

Pattern matching should specify:

```txt
exhaustiveness
irrefutability
binding modes
move/copy/borrow behavior
match guard order
nested pattern cost
or-pattern semantics
```

### Generics / Parametric Polymorphism

Design axes:

```txt
monomorphization: fast, code bloat, strong optimization
erasure: compact, weaker runtime type info
dictionary passing: flexible, typeclass-like, runtime indirection
reified generics: runtime info, compatibility issues
```

Avoid:

```txt
generics without variance rules
wildcards that nobody can explain
recursive bounds without diagnostics
implicit specialization that changes semantics
```

### Traits / Interfaces / Protocols / Typeclasses

Decide:

```txt
nominal or structural?
explicit implementation or inferred?
coherence rules?
orphan rules?
blanket impls?
specialization?
default methods?
associated types?
generic associated types?
object safety / dynamic dispatch?
```

Rule:

```txt
Protocol systems are global reasoning systems. Design conflict/coherence behavior early.
```

### Effects and Capabilities

Effect systems can track:

```txt
throws
async
IO
mutation
allocation
unsafe
FFI
nondeterminism
logging
state access
capabilities/permissions
```

Rule:

```txt
Do not add an effect system unless it solves a concrete problem and has an ergonomic escape story.
```

But also:

```txt
Do not pretend effects do not exist. Hidden effects become API hazards.
```

### Gradual Typing

Gradual typing needs:

```txt
clear dynamic/static boundary
runtime casts/checks
blame/error reporting
soundness policy
interop rules
performance model
```

Avoid:

```txt
"Any" as a hole that silently destroys guarantees everywhere.
```

Better:

```txt
Any: dynamic type with runtime checks
Unknown: safe top type requiring refinement
Never/Bottom: uninhabited type
Unit: one-value type
```

## Module, Package, and Namespace Design

### Module System Questions

```txt
Are modules files, declarations, packages, namespaces, or values?
Is import lexical or global?
Can imports be cyclic?
Are exports explicit?
Are re-exports supported?
Is initialization ordered?
Can modules have side effects at import time?
How are versions resolved?
Can multiple versions coexist?
Are packages reproducible/lockfile-based?
```

### Strict DAG Module Design

Prefer:

```txt
explicit imports
explicit exports
acyclic module graph by default
separate package graph from module graph
stable package manifest
reproducible resolution
```

If cycles are allowed, require a reason:

```txt
mutually recursive types/modules
recursive module signatures
runtime dynamic loading
plugin systems
```

Then model them explicitly.

### Initialization Hazards

Avoid:

```txt
arbitrary import-time side effects
order-dependent globals
cyclic initialization
lazy global initialization without thread model
```

Prefer:

```txt
explicit main/entrypoint/session initialization
pure module declarations
controlled initialization hooks
clear runtime module loader state
```

## Runtime Architecture

### Runtime Services

A runtime may include:

```txt
object model
value representation
allocator
GC / ARC / ownership runtime
module loader
reflection metadata
exception/condition system
async scheduler
threading/fibers/processes
FFI
stdlib native functions
JIT support
profiler/debugger hooks
security/capability model
```

Do not put all runtime services into one undifferentiated package.

Good split:

```txt
runtime-core
runtime-values
runtime-objects
runtime-memory
runtime-loader
runtime-ffi
runtime-exceptions
runtime-async
runtime-reflection
runtime-debug
```

### Value Representation

Decide:

```txt
tagged pointers?
NaN boxing?
boxed everything?
unboxed primitives?
uniform object header?
fat pointers?
interface dictionaries?
string encoding?
array layout?
closure representation?
```

Rule:

```txt
Value representation is a semantic/performance contract. Do not let it emerge accidentally.
```

### Calling Convention

Decide:

```txt
stack vs register VM
caller/callee cleanup
multiple returns
tail calls
closures/upvalues
varargs
keyword/named args
async frames
exception frames
FFI boundary
GC safepoints
```

Rule:

```txt
Calling convention connects compiler, VM/runtime, debugger, GC, and FFI. Treat it as a core contract.
```

## Memory Management and GC Styles

Memory management strategy is language design.

Options:

```txt
manual memory management
RAII / deterministic destruction
ownership/borrowing
reference counting
ARC with cycle handling
tracing GC
region/arena allocation
generational GC
incremental GC
concurrent GC
compacting GC
non-compacting GC
mark-sweep
mark-compact
copying/semi-space
mark-region / Immix-style
hybrid GC + ownership
escape-analysis stack allocation
```

### Manual Memory

Pros:

```txt
predictability
no GC pauses
low runtime requirement
FFI/system programming fit
```

Cons:

```txt
use-after-free
double free
leaks
ownership ambiguity
security hazards
```

Use when:

```txt
systems programming
embedded
game engines with custom allocators
kernel/runtime work
```

Need:

```txt
clear ownership conventions
allocator APIs
lifetime diagnostics/tools
safe abstractions if possible
```

### RAII / Deterministic Destruction

Pros:

```txt
resource cleanup is predictable
works for files/locks/sockets/GPU resources
low runtime overhead
```

Cons:

```txt
move/copy semantics complexity
cycles still need design
exceptions/unwinding interactions
```

Design requirements:

```txt
constructor/destructor semantics
move semantics
copy semantics
panic/exception cleanup
partial initialization rules
```

### Ownership / Borrowing

Pros:

```txt
memory safety without GC
aliasing control
thread-safety foundations
clear resource ownership
```

Cons:

```txt
high language complexity
diagnostics burden
API design constraints
learning curve
```

Need:

```txt
ownership transfer
borrowing rules
mutable vs shared access
lifetime/region reasoning
escape rules
unsafe escape hatches
```

Rule:

```txt
Do not add borrowing lightly. If added, make it central and coherent.
```

### Reference Counting / ARC

Pros:

```txt
predictable reclamation-ish
simple mental model for many users
works without global tracing pauses
```

Cons:

```txt
cycles
atomic overhead in concurrent contexts
retain/release traffic
weak reference complexity
```

Need:

```txt
cycle collection or weak references
ownership conventions
borrowed/non-owning references
FFI rules
```

### Mark-Sweep GC

Shape:

```txt
mark reachable objects
sweep unreachable objects
```

Pros:

```txt
simple tracing collector
handles cycles
objects need not move
FFI/pinning simpler
```

Cons:

```txt
fragmentation
sweep cost
pause times unless incremental/concurrent
```

### Mark-Compact GC

Shape:

```txt
mark reachable
move objects to compact heap
update references
```

Pros:

```txt
reduces fragmentation
improves locality
```

Cons:

```txt
moving objects complicate FFI/pinning
requires precise root/reference maps
pause cost
```

### Copying / Semi-Space GC

Shape:

```txt
copy live objects from from-space to to-space
```

Pros:

```txt
fast allocation
compaction naturally
simple collection of young objects
```

Cons:

```txt
space overhead
copying cost for live data
object addresses unstable
```

### Generational GC

Observation:

```txt
most objects die young
```

Pros:

```txt
fast minor collections
lower average pause for allocation-heavy programs
```

Cons:

```txt
write barriers
remembered sets
promotion policy
old-to-young references
more tuning complexity
```

### Incremental GC

Goal:

```txt
split GC work into small slices
```

Pros:

```txt
lower max pause
interactive workloads
```

Cons:

```txt
barriers
tri-color invariants
complex correctness
throughput tradeoff
```

### Concurrent GC

Goal:

```txt
collector runs alongside mutator threads
```

Pros:

```txt
lower pauses
server workloads
```

Cons:

```txt
write/read barriers
synchronization
floating garbage
hard debugging
```

### Mark-Region / Immix-Style GC

Immix is a mark-region family design using line/region organization and opportunistic defragmentation. Its key idea is to combine space efficiency, fast collection, and allocation locality better than classic mark-sweep/copying/mark-compact tradeoffs.

Design lesson:

```txt
GC families are not just "mark-sweep vs copying".
Region granularity, line marking, allocation locality, fragmentation policy,
and opportunistic evacuation all matter.
```

Use mark-region/Immix-style designs when:

```txt
you want non-moving common case with some defragmentation
you care about allocation locality
you want better fragmentation behavior than plain mark-sweep
you can afford collector implementation complexity
```

### Region / Arena Allocation

Pros:

```txt
very fast allocation
bulk free
simple lifetime model for compiler phases
excellent for AST/IR arenas
```

Cons:

```txt
poor for arbitrary object lifetimes
memory retention until region reset
requires lifetime discipline
```

Compiler use:

```txt
AST arena
HIR/IR arena
diagnostic arena
per-query temporary arena
per-compilation-unit arena
```

### GC Design Questions

Before choosing GC:

```txt
Is latency or throughput more important?
Are object addresses stable?
Is FFI common?
Are objects mostly short-lived?
Are programs interactive/server/batch/embedded?
Are threads/fibers used?
Can compiler emit precise stack maps?
Is reflection required?
Are weak references/finalizers needed?
Are destructors deterministic?
How are native resources managed?
```

Rule:

```txt
Do not choose a GC only by popularity. Choose from workload, runtime constraints, and implementation capacity.
```

## Error Handling Design

Error channels:

```txt
bug/panic/assertion failure
recoverable domain error
external IO/network/environment failure
cancellation/timeout
resource exhaustion
compiler diagnostic
runtime condition
```

Do not collapse all into exceptions.

Options:

```txt
Result<T, E>
Option<T>
exceptions
checked exceptions
effect-tracked throws
Common Lisp-style conditions/restarts
panic/unwind/abort
status codes
validation diagnostics
```

Design rule:

```txt
Different failure kinds need different semantics.
```

Common Lisp condition/restart lesson:

```txt
A condition can describe a problem without forcing immediate unwinding.
Restarts expose available recovery actions dynamically.
```

This is valuable for:

```txt
interactive systems
REPLs
compilers that can recover
long-running processes
developer tools
```

## Diagnostics Design

Diagnostics are part of language UX.

Core diagnostic model:

```txt
Diagnostic {
  code,
  severity,
  primary_span,
  labels,
  notes,
  help,
  suggestions,
  related,
  machine_applicability
}
```

Renderers:

```txt
terminal
JSON
LSP
HTML
IDE-specific
```

Rules:

```txt
compiler core emits structured diagnostics
renderers render diagnostics
checker does not print directly
parser does not know terminal color
```

Good diagnostics answer:

```txt
what happened?
where?
why?
what rule was violated?
what can fix it?
will the suggestion preserve semantics?
```

Avoid:

```txt
ambiguous parser errors
first-error cascades without recovery
spans pointing to huge expressions
messages that mention internal compiler representations
```

## Parser and Grammar Design

Parser options:

```txt
hand-written recursive descent
Pratt parser / precedence climbing
parser generator LR/LALR/GLR
PEG / packrat
parser combinators
lossless incremental parser
green/red tree architecture
```

Choose based on:

```txt
grammar complexity
error recovery needs
IDE incrementality
macro system
audience/tooling
implementation language
```

Rules:

```txt
Keep grammar regular.
Make ambiguity explicit.
Design error recovery early.
Formatter and parser must agree.
Do not rely on whitespace trivia unless the language owns it intentionally.
```

### Pratt / Precedence Parser

Good for expression-heavy languages.

Need:

```txt
binding powers table
associativity rules
prefix/infix/postfix distinction
mandatory parentheses for hazardous mixes if desired
```

### Lossless Syntax Trees

Needed for:

```txt
formatters
IDEs
refactoring
comments preservation
macro expansion tooling
```

If tooling-first, lossless trees are a foundation, not an add-on.

## Macro and Metaprogramming Design

Macro questions:

```txt
textual, token, AST, or typed macros?
hygienic or unhygienic?
compile-time execution?
phase separation?
module/import visibility during expansion?
can macros perform IO?
are expansions inspectable?
are diagnostics mapped to original source?
can macros define names/modules/types?
```

Avoid:

```txt
stringly code generation
global mutable compiler state
unhygienic capture by default
macros that defeat tooling
compile-time arbitrary execution without sandbox/security story
```

Common macro families:

```txt
C preprocessor: powerful textual substitution, many hazards
Lisp macros: syntactic/code-as-data extension
Scheme/Racket macros: hygiene and phase discipline
Rust macros: token trees, hygiene-ish, proc macro boundary
Template metaprogramming: type-level/generic computation
```

Rule:

```txt
Metaprogramming must preserve debuggability, diagnostics, and module boundaries.
```

## Concurrency Design

Concurrency models:

```txt
OS threads + locks
async/await futures
green threads/fibers
actors/processes
CSP channels
data parallelism
software transactional memory
structured concurrency
reactive/dataflow
shared-nothing isolates
```

Questions:

```txt
Are values immutable by default?
Can mutable state cross threads?
Is cancellation structured?
Are tasks scoped?
Are errors propagated through tasks?
Can async functions call sync functions and vice versa?
Does async color APIs?
What is the scheduler?
What is the memory model?
```

Lessons:

```txt
Erlang: failure supervision can be a language/runtime design.
Clojure: distinguish state/reference semantics.
Rust: ownership can encode Send/Sync safety.
Go: channels/goroutines work best with tooling and runtime support.
Java/C#: memory model and runtime libraries are inseparable from concurrency semantics.
```

Rule:

```txt
Do not bolt concurrency onto mutable shared state without a memory model.
```

## Standard Library Design

Stdlib is part of the language.

Core areas:

```txt
collections
strings/text/Unicode
IO/files/network
process/env
concurrency
math/numerics
time/date
serialization
reflection
errors/diagnostics
testing
package/build metadata
FFI
```

Rules:

```txt
Keep primitive operations coherent with language semantics.
Avoid giant kitchen-sink modules.
Avoid stringly APIs where typed APIs are viable.
Specify Unicode policy.
Specify time/date policy.
Specify resource ownership/closing behavior.
```

Collections questions:

```txt
mutable or immutable default?
persistent collections?
ordered maps?
hash stability?
equality semantics?
iteration invalidation?
concurrent collections?
```

String questions:

```txt
UTF-8/UTF-16/rope?
index by byte/code unit/code point/grapheme?
normalization?
slicing cost?
interop representation?
```

## Package Manager and Build System

Language design includes package/build UX.

Questions:

```txt
manifest format?
lockfile?
semver or alternative?
workspace/monorepo support?
build scripts?
native dependencies?
features/conditional compilation?
registries?
vendoring?
reproducible builds?
cross-compilation?
codegen/proc macros?
```

Bad patterns:

```txt
ambient global package state
non-reproducible resolution
build scripts with unlimited hidden effects
no way to vendor/cache dependencies
version conflicts impossible to diagnose
```

Good patterns:

```txt
explicit manifest
lockfile for applications
clear library vs binary package semantics
separate package resolution from module import
hermetic build mode
machine-readable diagnostics
```

## FFI and Interop Design

FFI questions:

```txt
C ABI?
C++ ABI?
host VM interop?
foreign exceptions?
ownership across boundary?
string encoding?
array layout?
callbacks?
thread attachment?
GC pinning?
async callbacks?
error conventions?
```

Rules:

```txt
FFI must be explicit.
Do not let foreign layout leak into normal language types unless intended.
Separate representation attributes from semantic type identity.
```

Attributes/examples:

```txt
@repr(.c)
@repr(.packed)
@foreign(.c, "strlen")
@calling_convention(.cdecl)
@layout(.transparent)
```

Be precise:

```txt
layout attribute: memory representation
foreign attribute: linkage/ABI binding
calling convention: call ABI
unsafe marker: trust boundary
```

Do not collapse all into one generic annotation.

## Unsafe / Trusted Escape Hatches

If language has unsafe:

```txt
What invariants can unsafe violate?
Can unsafe be localized?
Can safe APIs wrap unsafe internals?
Are unsafe effects visible in signatures/modules?
Can tooling audit unsafe blocks?
Can unsafe be forbidden in package policy?
```

Rules:

```txt
Unsafe is not "turn off the language".
Unsafe is a bounded proof obligation.
Safe code must remain safe regardless of unsafe implementation bugs only at documented trust boundaries.
```

## Versioning and Evolution

Language evolution mechanisms:

```txt
editions
feature gates
capability flags
preview features
strict deprecation/removal policy
compatibility modes
migration tooling
formatter-assisted rewrites
```

Rules:

```txt
Do not rely on eternal backward compatibility unless you can pay the complexity cost.
Do not break users casually.
Provide migration paths for syntax/semantic changes.
```

Edition lesson from Rust:

```txt
Editions can allow syntax/ecosystem evolution while preserving old code.
```

Compatibility lesson from C++:

```txt
Never removing mistakes keeps users but grows semantic debt.
```

## Designing for AI Agents and Large Codebases

Language/tooling should be machine-navigable:

```txt
explicit module graph
machine-readable diagnostics
stable formatter
fast parser
semantic index
query API
structured AST/IR dumps
compiler explanations for type errors
clear package manifests
no hidden global resolution when avoidable
```

Agent-friendly language traits:

```txt
self-documenting declarations
labeled arguments for ambiguous calls
explicit imports/exports
deterministic formatting
simple package graph
structured diagnostics
minimal magic
regular syntax
standard project layout recommendations
```

Anti-agent traits:

```txt
ambient imports
syntax with many context-sensitive exceptions
stringly dynamic APIs everywhere
unstructured compiler errors
large implicit prelude with conflicts
build behavior hidden in arbitrary scripts
```

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

## Example Package DAGs

### Small Interpreter

```txt
foundation
  ├─ source-map
  ├─ diagnostics-core
  └─ symbols

syntax
  ├─ lexer → foundation
  ├─ ast → foundation
  └─ parser → lexer + ast + diagnostics-core

semantics
  ├─ resolver → ast + symbols + diagnostics-core
  └─ checker → ast + resolver + diagnostics-core

runtime
  ├─ runtime-values → foundation
  ├─ environment → runtime-values + symbols
  └─ interpreter → ast + resolver + runtime-values + environment

tools
  ├─ repl → interpreter + parser
  └─ cli → parser + resolver + checker + interpreter
```

### Bytecode VM Language

```txt
foundation
syntax
semantics
bytecode-format
bytecode-compiler → semantics + bytecode-format
vm-core → bytecode-format + runtime-values
vm-runtime → vm-core
compiler-driver → parser + checker + bytecode-compiler
cli → compiler-driver + vm-runtime
```

### Native Compiler With Pluggable Backends

```txt
foundation
syntax
semantics
backend-contract
target-model
codegen-core → backend-contract + target-model
codegen-llvm → codegen-core
codegen-cranelift → codegen-core
codegen-c → codegen-core
runtime-abi → target-model
compiler-driver → semantics + codegen-core
cli → compiler-driver
```

### Tooling-First Compiler

```txt
source-db
lossless-syntax
parser
semantic-db
query-api
resolver-queries
type-queries
diagnostic-queries
formatter → lossless-syntax
lsp-adapter → query-api + diagnostics-renderer
cli → query-api + compiler-driver
```

## Language Design Red Flags

```txt
[ ] Syntax copied from C without re-evaluation.
[ ] Operators require a precedence poster.
[ ] Null is everywhere by default.
[ ] Error handling has one universal mechanism.
[ ] Runtime and compiler frontend import each other.
[ ] VM instruction format references AST node classes.
[ ] Typechecker stores backend-specific values.
[ ] Parser performs name resolution hacks.
[ ] Package manager behavior affects type checking implicitly.
[ ] Formatter cannot round-trip comments.
[ ] LSP types appear in compiler core.
[ ] FFI layout attributes affect normal semantic typing invisibly.
[ ] Macros can silently capture names.
[ ] Build scripts can mutate compiler behavior without declaration.
[ ] Implicit conversions change overload resolution unpredictably.
[ ] Numeric overflow policy differs silently by build mode.
[ ] Async/cancellation/error semantics are unspecified.
[ ] GC root/safepoint model is postponed until after VM implementation.
```

## Design Pattern Library

### Contract Package Pattern

```txt
bytecode-format
  owns instruction definitions, verifier-visible invariants, encoding/decoding types

bytecode-compiler
  consumes semantic representation, produces bytecode-format

vm
  consumes bytecode-format, executes it
```

### Model/Algorithm Split

```txt
type-model
  TypeId, TypeKind, TypeFlags, TypeRelation data

type-checker
  algorithms that infer/check types
```

### Structured Diagnostics Pattern

```txt
diagnostics-core
  Diagnostic, Label, Severity, Suggestion

diagnostics-render-terminal
  terminal rendering

diagnostics-render-lsp
  LSP conversion
```

### Target Capability Pattern

```txt
target-model
  pointer width
  endian
  alignment
  calling convention
  supported atomics
  exception model
  object layout constraints

codegen-target-x
  consumes target-model
```

### Runtime ABI Pattern

```txt
runtime-abi
  object header layout
  function call ABI
  GC root maps
  panic/exception ABI
  string/array ABI

compiler
  emits according to runtime-abi

runtime
  implements runtime-abi
```

### Semantic Index Pattern

```txt
semantic-index
  symbol definitions
  references
  type summaries
  module exports
  doc comments
  diagnostics keys

lsp/docgen/formatter
  consume semantic-index
```

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

## Reference Map

Use these references as design anchors. Do not copy designs blindly.

### Compiler/Interpreter Construction

- Crafting Interpreters, Robert Nystrom — tree-walk interpreter and bytecode VM architecture: https://craftinginterpreters.com/
- LLVM Kaleidoscope tutorial — implementing a frontend using LLVM: https://llvm.org/docs/tutorial/
- rustc dev guide, query system — demand-driven compilation: https://rustc-dev-guide.rust-lang.org/query.html
- rustc dev guide, HIR: https://rustc-dev-guide.rust-lang.org/hir.html
- rustc dev guide, MIR: https://rustc-dev-guide.rust-lang.org/mir/index.html
- Cranelift — frontend-generated IR compiled to machine code by an embeddable backend: https://cranelift.dev/
- WebAssembly Core Specification — portable stack-machine execution format: https://www.w3.org/TR/wasm-core-2/

### Garbage Collection / Memory Management

- Go GC guide — concurrent mark-sweep GC and application cost model: https://go.dev/doc/gc-guide
- Immix paper — mark-region GC with opportunistic defragmentation: https://www.steveblackburn.org/pubs/papers/immix-pldi-2008.pdf
- Memory Management Reference: https://www.memorymanagement.org/

### Established Language Lessons

- AdaCore Ada overview — strong typing, contracts, readability, safety: https://www.adacore.com/languages/ada
- AdaCore Learn Ada — Ada philosophy/readability/strong typing: https://learn.adacore.com/courses/intro-to-ada/chapters/introduction.html
- Rust Book, ownership: https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html
- Common Lisp HyperSpec, condition system: https://www.lispworks.com/documentation/HyperSpec/Body/09_a.htm
- Common Lisp HyperSpec, restarts: https://www.lispworks.com/documentation/HyperSpec/Body/09_adb.htm
- Common Lisp HyperSpec, standard-class/CLOS references: https://www.lispworks.com/documentation/HyperSpec/Body/t_std_cl.htm
- Clojure atoms: https://clojure.org/reference/atoms
- Clojure agents: https://clojure.org/reference/agents
- Niklaus Wirth, recollections on Pascal: https://pascal.hansotten.com/niklaus-wirth/recollections-about-the-development-of-pascal/
- ETH Zurich Pascal retrospective: https://inf.ethz.ch/news-and-events/spotlights/infk-news-channel/2021/04/niklaus-wirth-pascal-conquers-the-world.html
- Dennis Ritchie, The Development of the C Language: https://www.nokia.com/bell-labs/about/dennis-m-ritchie/chist.pdf

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

## Closing Rule

Design languages by making semantics explicit, contracts stable, and dependencies acyclic.

Do not cargo-cult LLVM, Rust, Lisp, C, or any other system.

Extract the principle, then choose the smallest architecture that preserves correctness, tooling, runtime integrity, and user comprehension.
