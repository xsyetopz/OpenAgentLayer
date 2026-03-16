---
name: optimize
description: >
  Performance optimization patterns, profiling guidance, and common bottleneck identification.
  Triggers: performance, optimize, slow, bottleneck, profiling, latency, throughput,
  memory usage, CPU usage, N+1, caching, benchmark.
user-invocable: true
---

# Performance Guide

## First Principle

**Measure before optimizing. Profile before guessing.**

Never optimize without profiling evidence. The bottleneck is rarely where you think it is.

## Investigation Protocol

1. **Reproduce** - get a reproducible, measurable performance issue
2. **Measure** - establish a baseline with numbers (latency, throughput, memory)
3. **Profile** - use profiling tools to identify the actual bottleneck
4. **Fix** - make a targeted change to the identified bottleneck
5. **Verify** - measure again to confirm improvement and check for regressions

## Common Bottlenecks

### N+1 Queries

```python
# Problem: 1 query for users + N queries for orders
for user in users:
    orders = db.query(f"SELECT * FROM orders WHERE user_id = {user.id}")

# Fix: join or batch
users_with_orders = db.query("SELECT u.*, o.* FROM users u LEFT JOIN orders o ON o.user_id = u.id")
```

### Allocations in Loops

```rust
// Problem: new Vec per iteration
for item in items {
    let buffer = Vec::new();
    process(&mut buffer, item);
}

// Fix: allocate once, reuse
let mut buffer = Vec::new();
for item in items {
    buffer.clear();
    process(&mut buffer, item);
}
```

### Blocking in Async

```typescript
// Problem: sequential when operations are independent
for (const item of items) {
  await heavyComputation(item);
}

// Fix: parallelize
await Promise.all(items.map(item => heavyComputation(item)));
```

### Missing Indexes

```sql
-- Fix: index the queried column
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
```

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

| Language        | CPU Profiler               | Memory Profiler                  |
| --------------- | -------------------------- | -------------------------------- |
| Rust            | `cargo flamegraph`, `perf` | `dhat`, `heaptrack`              |
| TypeScript/Node | `--prof`, `clinic.js`      | `--heap-prof`, Chrome DevTools   |
| Python          | `cProfile`, `py-spy`       | `tracemalloc`, `memory-profiler` |
| Go              | `pprof`                    | `pprof` (heap profile)           |

## Anti-Patterns

| Anti-Pattern                    | Problem                                  |
| ------------------------------- | ---------------------------------------- |
| Premature optimization          | Wastes time on non-bottlenecks           |
| Caching without measurement     | Adds complexity, may not help            |
| Micro-benchmarking in isolation | Results don't reflect real workload      |
| Optimizing cold paths           | 1% of code gets 99% of traffic           |
| Adding indexes blindly          | Slows writes, uses disk, may not be used |
