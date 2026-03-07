# Project Index

**Updated:** {TIMESTAMP}
**Files:** {FILE_COUNT} | **LOC:** {TOTAL_LOC}

## Module Map

| Module | Files | LOC | Entry | Exports |
|--------|-------|-----|-------|---------|
| {module_name} | {count} | {loc} | {entry_file} | {exported_symbols} |

## Symbol Index (public only)

| Symbol | Kind | File:Line | Module |
|--------|------|-----------|--------|
| {symbol_name} | {struct/fn/trait/enum} | {file}:{line} | {module} |

## Feature -> Files Map

| Feature | Files |
|---------|-------|
| {feature_name} | {file_patterns} |

## Import Graph

```
{module_a} -> {dependency_1}, {dependency_2}
{module_b} -> {dependency_3}
```

## Detected Patterns

| Pattern | Example | Files Using |
|---------|---------|-------------|
| {pattern_name} | {code_example} | {count} |

---

## Instructions for Indexer

To fill this template:

1. **Module Map**: Group files by top-level directory or Cargo.toml/package.json
2. **Symbol Index**: Only public/exported symbols, use file signatures
3. **Feature Map**: Group by functional area (auth, payments, etc.)
4. **Import Graph**: Parse import statements from file headers
5. **Patterns**: Identify recurring code patterns (error handling, builders, etc.)

Keep this file under 1000 lines. Archive old entries to `project-index-archive.md`.
