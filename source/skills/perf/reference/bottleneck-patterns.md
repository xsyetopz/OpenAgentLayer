# Bottleneck Patterns

Common performance bottlenecks with detection, ORM-specific examples, and fix patterns.

---

## N+1 Queries

### Detection

Symptoms: request time scales linearly with collection size. Log shows many similar queries with different IDs.

```sql
-- What to look for in query logs: repeated queries differing only by ID
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;
SELECT * FROM orders WHERE user_id = 3;
-- ... N more times
```

### Raw SQL Fix

```diff
- for user in users:
-     orders = db.execute("SELECT * FROM orders WHERE user_id = ?", [user.id])
+ users_with_orders = db.execute("""
+     SELECT u.*, o.id as order_id, o.total
+     FROM users u
+     LEFT JOIN orders o ON o.user_id = u.id
+ """)
```

### Prisma (TypeScript)

```diff
- const users = await prisma.user.findMany();
- for (const user of users) {
-     const orders = await prisma.order.findMany({ where: { userId: user.id } });
- }
+ const users = await prisma.user.findMany({
+     include: { orders: true },
+ });
+
+ const users = await prisma.user.findMany({
+     include: { orders: { select: { id: true, total: true } } },
+ });
```

### SQLAlchemy (Python)

```diff
- users = session.query(User).all()
- for user in users:
-     print(user.orders)  # query fires here
+ from sqlalchemy.orm import joinedload
+
+ users = session.query(User).options(joinedload(User.orders)).all()
+
+ from sqlalchemy.orm import subqueryload
+ users = session.query(User).options(subqueryload(User.orders)).all()
```

### GORM (Go)

```diff
- var users []User
- db.Find(&users)
- for _, user := range users {
-     db.Find(&user.Orders)  // separate query each iteration
- }
+ var users []User
+ db.Preload("Orders").Find(&users)
+
+ db.Preload("Orders").Preload("Profile").Find(&users)
+
+ db.Preload("Orders", "status = ?", "shipped").Find(&users)
```

### ActiveRecord / Rails pattern (for reference)

```diff
- User.all.each { |u| u.orders.count }
+ User.includes(:orders).each { |u| u.orders.count }
```

---

## Allocations in Hot Loops

### Detection

Profiler shows allocation functions (malloc, new) in tight loops. GC pressure visible as frequent GC pauses.

### Rust

```diff
- for item in &items {
-     let mut buffer: Vec<u8> = Vec::new();
-     encode_item(&mut buffer, item);
-     send(&buffer);
- }
+ let mut buffer: Vec<u8> = Vec::with_capacity(1024);
+ for item in &items {
+     buffer.clear();
+     encode_item(&mut buffer, item);
+     send(&buffer);
+ }
```

### Go

```diff
- func handleRequest(items []Item) {
-     seen := make(map[string]bool)  // allocates on heap each call
-     for _, item := range items {
-         seen[item.ID] = true
-     }
- }
+ var pool = sync.Pool{
+     New: func() any { return make(map[string]bool) },
+ }
+
+ func handleRequest(items []Item) {
+     seen := pool.Get().(map[string]bool)
+     defer func() {
+         for k := range seen { delete(seen, k) }
+         pool.Put(seen)
+     }()
+     for _, item := range items {
+         seen[item.ID] = true
+     }
+ }
```

### TypeScript

```diff
- const results: Result[] = [];
- for (const item of items) {
-     results.push(...processItem(item));  // spread allocates new array
- }
+ const results: Result[] = [];
+ for (const item of items) {
+     const processed = processItem(item);
+     for (const r of processed) results.push(r);
+ }
+
+ const flatResults = items.flatMap(processItem);
```

---

## Blocking in Async / Event Loop

### Detection

Node.js: high event loop lag (`clinic doctor` shows "Your process is unresponsive"). Python asyncio: warnings about long-running coroutines.

### TypeScript -- Sequential vs Parallel

```diff
- for (const userId of userIds) {
-     const user = await fetchUser(userId);   // waits for each
-     results.push(user);
- }
+ const users = await Promise.all(userIds.map(fetchUser));
+
+ import pLimit from 'p-limit';
+ const limit = pLimit(10);
+ const limitedUsers = await Promise.all(
+     userIds.map(id => limit(() => fetchUser(id)))
+ );
```

### TypeScript -- Sync work on event loop

```diff
- app.get('/compute', (req, res) => {
-     const result = heavyComputation(req.body);  // blocks all other requests
-     res.json(result);
- });
+ import Piscina from 'piscina';
+ const piscina = new Piscina({ filename: './worker.js' });
+
+ app.get('/compute', async (req, res) => {
+     const result = await piscina.run(req.body);
+     res.json(result);
+ });
```

### Python asyncio

```diff
- async def process_user(user_id: str):
-     data = requests.get(f"/api/users/{user_id}")  # blocks event loop!
+ import httpx
+
+ async def process_user(user_id: str):
+     async with httpx.AsyncClient() as client:
+         data = await client.get(f"/api/users/{user_id}")
```

```diff
- async def process_all(ids: list[str]):
-     results = []
-     for id in ids:
-         result = await fetch(id)
-         results.append(result)
+ async def process_all(ids: list[str]):
+     results = await asyncio.gather(*[fetch(id) for id in ids])
```

---

## Missing Indexes

### Detection

```sql
-- PostgreSQL: find sequential scans on large tables
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_email = 'user@example.com';
-- Look for: "Seq Scan" on large table, high "rows" estimate

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Index Creation

```sql
-- Single column (most common)
CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- Composite (column order matters -- put equality columns first)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Supports: WHERE user_id = ? AND status = ?
-- Supports: WHERE user_id = ?
-- Does NOT support: WHERE status = ? (alone)

-- Partial index (index only relevant rows)
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;  -- unused indexes
```

### ORM Index Definitions

```typescript
// Prisma
model Order {
  id     String @id
  userId String
  status String

  @@index([userId])
  @@index([userId, status])
}
```

```python
# SQLAlchemy
class Order(Base):
    __tablename__ = 'orders'
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)  # simple index
    status = Column(String)

    __table_args__ = (
        Index('idx_user_status', 'user_id', 'status'),  # composite
    )
```

---

## Caching Patterns

### When to cache (all three must be true)

1. Computation is measurably expensive (profile first)
2. Same inputs recur frequently
3. Staleness is acceptable

### Always define before implementing

- **Key strategy**: what makes a cache entry unique
- **Eviction policy**: LRU, TTL, size-based, or explicit invalidation
- **Invalidation triggers**: what events make the cache stale
- **Maximum size**: prevent unbounded memory growth

```typescript
// LRU cache with TTL
import LRU from 'lru-cache';

const cache = new LRU<string, UserProfile>({
    max: 1000,                    // max 1000 entries
    ttl: 1000 * 60 * 5,          // 5 minute TTL
    updateAgeOnGet: false,        // TTL is absolute, not sliding
});

async function getProfile(userId: string): Promise<UserProfile> {
    const cached = cache.get(userId);
    if (cached) return cached;

    const profile = await db.fetchProfile(userId);
    cache.set(userId, profile);
    return profile;
}

// Invalidate on update
async function updateProfile(userId: string, data: Partial<UserProfile>) {
    await db.updateProfile(userId, data);
    cache.delete(userId);  // explicit invalidation
}
```
