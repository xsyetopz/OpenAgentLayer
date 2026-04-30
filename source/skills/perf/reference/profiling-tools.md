# Profiling Tools Reference

Commands, flags, and output interpretation per language. Measure before optimizing.

---

## Rust

### CPU Profiling -- cargo flamegraph

```bash
cargo install flamegraph
cargo flamegraph --bin myapp -- --arg value
cargo flamegraph --test mytest
```

Output: `flamegraph.svg`. Wide frames = hot functions. Tall stacks = deep call chains.

### CPU Profiling -- perf (Linux)

```bash
perf record -g cargo run --release
perf report --stdio
```

Look for functions with highest `% Self` time.

### Memory -- dhat

```toml
[profile.release]
debug = true
```

```rust
#[global_allocator]
static ALLOC: dhat::Alloc = dhat::Alloc;

fn main() {
    let _profiler = dhat::Profiler::new_heap();
    run_app();
}
```

```bash
cargo run --release
```

Outputs `dhat-heap.json`. View at <https://nnethercote.github.io/dh_view/dh_view.html>. Key metrics: total bytes, peak bytes, top allocation sites.

### Memory -- heaptrack

```bash
heaptrack cargo run --release
heaptrack_gui heaptrack.*.gz
# Shows: heap usage over time, allocation hotspots, leaked memory
```

---

## TypeScript / Node.js

### CPU Profiling -- --prof

```bash
node --prof dist/server.js
node --prof-process isolate-*.log > profile.txt
cat profile.txt
```

Sections in output: `[JavaScript]`, `[C++]`, `[Summary]`. Look for functions with highest ticks count.

### CPU + Memory -- clinic.js

```bash
bun install -g clinic
clinic flame -- node dist/server.js        # CPU flame graph
clinic heapprofiler -- node dist/server.js # heap
clinic doctor -- node dist/server.js       # auto-detects: event loop lag, memory leak, I/O
```

### Memory -- --heap-prof

```bash
node --heap-prof dist/server.js
```

Generates `*.heapprofile`. Open in Chrome DevTools -> Memory -> Load profile. Key metrics: retained size, object counts, allocation traces.

### Chrome DevTools (for long-running processes)

```bash
node --inspect dist/server.js
```

Open `chrome://inspect`. Memory tab -> Take heap snapshot. Compare two snapshots to find leaks.

---

## Python

### CPU -- cProfile

```bash
python -m cProfile -s cumulative myapp.py
```

Sort options: `cumulative` (time in function + callees -- find entry points), `tottime` (function only -- find bottleneck), `calls`.

```bash
python -m cProfile -o profile.out myapp.py
python -m pstats profile.out
```

```python
import cProfile
profiler = cProfile.Profile()
profiler.enable()
result = slow_function()
profiler.disable()
profiler.print_stats(sort='cumulative')
```

### CPU -- py-spy (sampling, no code changes)

```bash
pip install py-spy
py-spy top --pid 12345                           # live top-like view
py-spy record -o profile.svg -- python myapp.py # flame graph -> profile.svg
```

py-spy works on running processes without modification -- useful for production debugging.

### Memory -- tracemalloc

```python
import tracemalloc

tracemalloc.start()
# ... run code
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)
# Shows: file:line, size, count
```

### Memory -- memory-profiler

```bash
pip install memory-profiler

# Decorate function
from memory_profiler import profile

@profile
def my_function():
    ...

python -m memory_profiler myapp.py
# Shows line-by-line memory usage
```

---

## Go

### pprof -- CPU

```go
import (
    "net/http"
    _ "net/http/pprof"  // blank import registers handlers
)

func main() {
    go http.ListenAndServe(":6060", nil)
    // ... rest of app
}
```

```bash
# Collect 30-second CPU profile
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Inside pprof interactive:
(pprof) top10          # top 10 functions by CPU
(pprof) web            # flame graph in browser (requires graphviz)
(pprof) list FuncName  # annotated source for function
```

### pprof -- Heap

```bash
go tool pprof http://localhost:6060/debug/pprof/heap

(pprof) top10 -cum     # top allocators by cumulative size
(pprof) inuse_objects  # currently live object counts
(pprof) alloc_space    # all allocations (including GC'd)
```

### Benchmark Profiling

```bash
# Run benchmarks with CPU profile
go test -bench=BenchmarkMyFunc -cpuprofile=cpu.out ./...
go tool pprof cpu.out

# With memory profile
go test -bench=. -memprofile=mem.out ./...
go tool pprof mem.out
```

### Trace (goroutine + GC)

```bash
go test -trace=trace.out ./...
go tool trace trace.out
# Shows: goroutine activity, GC pauses, blocking events
```

---

## Interpreting Results

| Metric                | High value means    | Look for                              |
| --------------------- | ------------------- | ------------------------------------- |
| CPU `tottime`         | Hot function body   | Algorithmic inefficiency, tight loops |
| CPU `cumtime`         | Expensive call tree | Wrong abstraction, repeated calls     |
| Heap `inuse_space`    | Live memory         | Caches too large, leaks               |
| Heap `alloc_space`    | GC pressure         | Allocations in hot loops              |
| Event loop lag (Node) | Blocked main thread | Sync I/O, long computations           |
