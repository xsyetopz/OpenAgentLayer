# Claude Code Instructions for ClaudeAgents Repository

This repository contains agent definitions, memory schemas, and templates for building token-efficient agent teams.

## What This Repository Is

A **meta-repository** for creating and iterating on Claude Code agent architectures. Components are copied/symlinked to target projects.

## Key Principles

### Token Efficiency

- All agents prioritize reading from `.claude/memory/` before source files
- Index files use compact table formats, not prose
- Agents never read files "just to understand" - they use the symbol index
- Target: Major features in <145K tokens total across all agents

### Feature-Oriented Modules

- Each feature is a self-contained module
- Types at top, core logic, traits, tests, helpers
- Matches pattern from `token.rs` analysis

### Communication Protocol

- Agents communicate via `.claude/memory/tasks.md`
- File locks prevent edit conflicts via `.claude/memory/locks.md`
- No direct agent-to-agent messaging (reduces token overhead)

## File Purposes

| Directory | Purpose |
|-----------|---------|
| `agents/` | Agent markdown files with YAML frontmatter |
| `memory/templates/` | Blank memory schemas |
| `memory/examples/` | Example filled-in memories |
| `skills/` | Auto-activation skill definitions |
| `hooks/` | Hook configurations |
| `module-templates/` | Language-specific feature module templates |
| `workflows/` | Step-by-step workflow guides |
| `scripts/` | Installation and utility scripts |
| `docs/` | Extended documentation |

## Editing Guidelines

### When modifying agent definitions

1. Keep system prompts focused and actionable
2. Include specific token efficiency rules
3. Define clear "when to use" triggers
4. Specify outputs each agent produces

### When modifying memory templates

1. Use markdown tables for structured data
2. Include timestamp and metadata fields
3. Keep examples minimal but complete

### When modifying module templates

1. Follow the 5-section pattern: types, core, traits, tests, helpers
2. Include placeholder comments explaining each section
3. Ensure templates compile/parse in their language

## Testing Changes

After modifying this repository:

1. **Unit test**: Install to a small test project
2. **Verify indexer**: Can index 100+ files in <25K tokens
3. **Verify workflow**: Full feature cycle completes
4. **Verify communication**: Agents use task list correctly

## Common Tasks

### Adding a new agent

1. Create `agents/{name}.md`
2. Define YAML frontmatter with model, tools, triggers
3. Write system prompt following existing patterns
4. Update README.md agent table

### Adding a new language template

1. Create `module-templates/{lang}/feature-module/`
2. Add template files following the 5-section pattern
3. Update README.md supported languages

### Modifying memory schemas

1. Update `memory/templates/{schema}.md`
2. Update corresponding example in `memory/examples/`
3. Verify agents that produce this schema are updated

## Orchestration: Teams vs Subagents

The orchestrating agent must intelligently decide between agent teams and normal subagents based on actual task complexity, not perceived complexity.

### Use Subagents When

- Task scope is narrow and well-defined
- Single module affected
- No cross-cutting concerns
- User's request is straightforward even if it sounds complex
- Sequential dependencies make parallelism unhelpful

### Use Agent Teams When

- Genuinely parallel work is possible (e.g., research + implementation)
- Multiple disjoint modules need simultaneous changes
- Task requires design review before implementation
- Cross-layer coordination (frontend + backend + database)
- Debugging with competing hypotheses

### Do NOT assume complexity based on word count

A user saying "refactor the auth module" might be simple (rename a few things) or complex (full decomposition). Assess actual scope before choosing orchestration strategy.

## Code Philosophy

- Self-documenting code over verbose comments
- Comments explain "why", never "what"
- Meaningful names: `parse_primary_expr` not `parse_primary`
- If a comment is needed to explain code, the code should probably be rewritten

## Code Intelligence

Prefer LSP over Grep/Read for code navigation—faster, precise, avoids reading entire files:

- `workspaceSymbol` to find where something is defined
- `findReferences` to see all usages across the codebase
- `goToDefinition` / `goToImplementation` to jump to source
- `hover` for type info without reading the file

Use Grep only when LSP isn't available or for text/pattern searches (comments, strings, config).
After writing or editing code, check LSP diagnostics and fix errors before proceeding.

## Design Principles

### SRP (Single Responsibility Principle)

**Correct understanding**: A module should have one *reason to change*, not one *thing*.

`token.rs` containing `Token`, `TokenKind`, `TokenSpan` does NOT violate SRP—they all change together when token representation changes. That's one responsibility: "token representation".

<violations>
<subtle>
```rust
// BAD: UserService that sends emails
impl UserService {
    fn create_user(&self, data: UserData) -> User { ... }
    fn send_welcome_email(&self, user: &User) { ... }  // Wrong place!
}
```
Two reasons to change: user logic AND email logic. Extract `EmailService`.
</subtle>

<subtle>
```rust
// BAD: Repository that formats output
impl UserRepository {
    fn find_by_id(&self, id: &str) -> User { ... }
    fn to_json(&self, user: &User) -> String { ... }  // Wrong place!
}
```
Serialization is a separate concern. Use `serde` or separate serializer.
</subtle>
</violations>

### DRY (Don't Repeat Yourself)

Not just "no duplicate code"—it's about single source of truth for *knowledge*.

<violations>
<subtle>
```rust
// BAD: Magic number in multiple places
fn validate_password(p: &str) -> bool { p.len() >= 8 }
fn password_hint() -> &'static str { "Must be at least 8 characters" }
// If min length changes, must update BOTH
```
Extract: `const MIN_PASSWORD_LENGTH: usize = 8;`
</subtle>

<subtle>
```rust
// BAD: Validation logic duplicated
fn create_user(email: &str) { if !email.contains('@') { panic!() } ... }
fn update_email(email: &str) { if !email.contains('@') { panic!() } ... }
```
Extract: `fn validate_email(email: &str) -> Result<(), ValidationError>`
</subtle>
</violations>

### KISS (Keep It Simple, Stupid)

<violations>
<subtle>
```rust
// BAD: Over-abstracted for one use case
trait Processor<T, U, E> { fn process(&self, input: T) -> Result<U, E>; }
struct JsonProcessor;
impl Processor<String, Value, Error> for JsonProcessor { ... }
// Used exactly once. Just write a function.
```
</subtle>

<subtle>
```rust
// BAD: Premature optimization
fn get_user(id: &str) -> User {
    let cache = GLOBAL_CACHE.read().unwrap();
    if let Some(u) = cache.get(id) { return u.clone(); }
    drop(cache);
    let user = db.find(id);
    GLOBAL_CACHE.write().unwrap().insert(id, user.clone());
    user
}
// No evidence caching is needed. Measure first.
```
</subtle>
</violations>

## Useful Algorithms

### Incremental Indexing

```markdown
1. git diff --name-only HEAD~N > changed_files
2. If changed_files.len() < threshold: update only those
3. Else: full reindex
4. Update timestamp
```

### Feature Clustering (for indexer)

```markdown
1. Group files by directory
2. Within directory, cluster by naming prefix (auth_*, user_*)
3. Refine by import graph connectivity
4. Output: feature -> [files] mapping
```

### Lock-Free Coordination

```markdown
1. Before edit: append to locks.md with timestamp
2. Check for conflicts (same file, different owner)
3. If conflict: back off, message in tasks.md
4. After edit: remove lock entry
5. Stale locks (>1h): can be cleaned up
```

## Data Structures

### Project Index Schema

```ignore
project-index.md
├── metadata (timestamp, file count, LOC)
├── module_map: {module -> (files, loc, entry, exports)}
├── symbol_index: {symbol -> (kind, file:line, module)}
├── feature_map: {feature -> [files]}
├── import_graph: {module -> [dependencies]}
└── patterns: {pattern -> (example, count)}
```

### Task Coordination Schema

```ignore
tasks.md
├── active_tasks: [{id, owner, status, description, files, blocked_by}]
├── completed_tasks: [{id, owner, completed_at, description}]
└── messages: [{timestamp, from, to, content}]
```
