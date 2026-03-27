---
name: perf
description: Performance optimization patterns, profiling guidance, and common bottleneck identification. Triggers: performance, optimize, slow, bottleneck, profiling, latency, throughput, memory usage, CPU usage, N+1, caching, benchmark.
compatibility: opencode
---
# Performance Guide

## First Principle

**Measure before optimizing. Profile before guessing.**

## Investigation Protocol

1. **Reproduce** - get a reproducible, measurable performance issue
2. **Measure** - establish a baseline with numbers (latency, throughput, memory)
3. **Profile** - use profiling tools to identify the actual bottleneck
4. **Fix** - make a targeted change to the identified bottleneck
5. **Verify** - measure again to confirm improvement and check for regressions

## Common Bottlenecks

See `reference/bottleneck-patterns.md` for N+1 patterns (Prisma, SQLAlchemy, GORM), allocation reuse, async parallelization, missing indexes, and caching implementations.

## Data Structure Selection

| Need               | Structure                | Why                               |
| ------------------ | ------------------------ | --------------------------------- |
| Ordered iteration  | Vec/Array                | Cache-friendly, contiguous memory |
| Fast lookup by key | HashMap/Map              | O(1) average lookup               |
| Ordered keys       | BTreeMap/TreeMap         | O(log n) lookup with ordering     |
| Uniqueness         | HashSet/Set              | O(1) membership test              |
| FIFO               | VecDeque/Queue           | O(1) push/pop at both ends        |
| Priority           | BinaryHeap/PriorityQueue | O(log n) insert, O(1) max         |

## Caching Rules

Cache only when:

1. The computation is measurably expensive
2. The same inputs recur frequently
3. Staleness is acceptable for the use case

Always define: cache key strategy, eviction policy (LRU, TTL, size-based), invalidation triggers, maximum cache size.

## Profiling Tools

See `reference/profiling-tools.md` for commands, flags, and output interpretation per language (Rust, TypeScript/Node, Python, Go).

## Anti-Patterns

| Anti-Pattern                    | Problem                                  |
| ------------------------------- | ---------------------------------------- |
| Premature optimization          | Wastes time on non-bottlenecks           |
| Caching without measurement     | Adds complexity, may not help            |
| Micro-benchmarking in isolation | Results don't reflect real workload      |
| Optimizing cold paths           | 1% of code gets 99% of traffic           |
| Adding indexes blindly          | Slows writes, uses disk, may not be used |
