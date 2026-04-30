# API Attack Patterns

Attack descriptions, vulnerable patterns, detection heuristics, and mitigations for API-specific vulnerabilities.

---

## BOLA / IDOR (Broken Object Level Authorization)

**Severity**: CRITICAL

An authenticated user accesses or modifies another user's resources by changing an ID in the request.

```diff
- app.get('/api/invoices/:id', auth, async (req, res) => {
-   const invoice = await db.invoices.find(req.params.id);
-   res.json(invoice);  // any user can read any invoice
- });
+ app.get('/api/invoices/:id', auth, async (req, res) => {
+   const invoice = await db.invoices.find(req.params.id);
+   if (!invoice || invoice.ownerId !== req.user.id) {
+     return res.status(404).json({ error: 'not found' });
+   }
+   res.json(invoice);
+ });
```

**Detection**: Search for `findById`, `findOne`, `db.get(Model, id)` without ownership check. Also check bulk endpoints (`/users/bulk-delete`, `/orders?ids=...`).

---

## Mass Assignment / Over-Posting

**Severity**: HIGH

Request body bound directly to model, allowing users to set fields they shouldn't (e.g., `role`, `isAdmin`, `price`).

```diff
- app.post('/users', async (req, res) => {
-   const user = await User.create(req.body);  // attacker sends { role: 'admin' }
-   res.json(user);
- });
+ app.post('/users', async (req, res) => {
+   const { name, email, password } = req.body;  // only accept known safe fields
+   const user = await User.create({ name, email, password });
+   res.json(user);
+ });
```

```diff
- user = User(**request.json)
+ allowed = {'name', 'email', 'password'}
+ user = User(**{k: v for k, v in request.json.items() if k in allowed})
```

**Detection**: `Object.assign(entity, req.body)`, `**request.json` without filtering, ORM `create(req.body)`.

---

## SSRF (Server-Side Request Forgery)

**Severity**: CRITICAL

Server fetches a URL controlled by the attacker, enabling access to internal services or cloud metadata.

```python
@app.post('/webhook/test')
def test_webhook(url: str):
    response = requests.get(url)  # attacker sends http://169.254.169.254/...
    return response.text
```

**Mitigation layers** (defense in depth):

1. Allowlist: only permit known external hosts
2. DNS resolution + IP check: resolve hostname, reject private/loopback/link-local IPs
3. Block at network level: outbound firewall rules from app servers

Blocked ranges:

- `169.254.169.254` -- AWS/GCP/Azure instance metadata
- `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` -- RFC-1918 private
- `127.0.0.0/8`, `::1` -- loopback
- `fd00::/8` -- IPv6 unique local

---

## Insecure Deserialization

**Severity**: CRITICAL

Deserializing attacker-controlled data using formats that execute arbitrary code.

| Format        | Dangerous                   | Safe alternative         |
| ------------- | --------------------------- | ------------------------ |
| Python pickle | `pickle.loads(data)`        | JSON + schema validation |
| PyYAML        | `yaml.load(data)`           | `yaml.safe_load(data)`   |
| Java          | `ObjectInputStream`         | Jackson with allowlist   |
| PHP           | `unserialize($data)`        | `json_decode($data)`     |
| Ruby          | `Marshal.load(data)`        | JSON + strict schema     |
| Node.js       | `serialize-javascript` eval | JSON.parse + schema      |

```diff
- import pickle
- obj = pickle.loads(request.get_data())
+ import json
+ from pydantic import BaseModel
+
+ class Payload(BaseModel):
+     action: str
+     target_id: int
+
+ payload = Payload(**json.loads(request.get_data()))
```

---

## GraphQL -- Unbounded Depth and Batching

**Severity**: HIGH

Deeply nested queries or batched operations bypass rate limits and cause DoS.

```graphql
# Malicious: exponential data fetch
query {
  user {
    friends {
      friends {
        friends {
          friends { id name email }
        }
      }
    }
  }
}
```

**Mitigations**:

```javascript
// Depth limit
import depthLimit from 'graphql-depth-limit';
const schema = makeExecutableSchema({ ... });
app.use('/graphql', graphqlHTTP({
  schema,
  validationRules: [depthLimit(7)],
}));

// Complexity limit (graphql-query-complexity)
// Disable introspection in production
const introspectionDisabled = process.env.NODE_ENV === 'production'
  ? [NoIntrospection]
  : [];
```

Recommended limits: max depth ≤ 10, complexity budget per query, batch size ≤ 10 operations.

---

## Rate Limiting Bypass

**Severity**: HIGH

Attackers exhaust resources, enumerate data, or brute-force credentials by bypassing rate limits.

**Common bypasses**:

- IP rotation: rate limit by IP only -> bypass with proxies
- Account enumeration: limit per IP, not per account
- Header spoofing: `X-Forwarded-For`, `X-Real-IP` manipulation

```diff
- rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
+ const limiter = rateLimit({
+   windowMs: 15 * 60 * 1000,
+   max: 10,
+   keyGenerator: (req) => `${req.ip}:${req.body?.email ?? 'anonymous'}`,
+ });
+
+ app.set('trust proxy', ['loopback', '10.0.0.0/8']);
```

Endpoints requiring rate limits:

- `POST /login`, `POST /register`
- `POST /password-reset`, `POST /verify-otp`
- Any endpoint using API keys or tokens in the URL

---

## JWT Vulnerabilities

**Severity**: HIGH

| Attack              | Pattern                                   | Fix                                           |
| ------------------- | ----------------------------------------- | --------------------------------------------- |
| Algorithm confusion | `alg: none` or switching RS256 -> HS256   | Explicitly specify algorithm, reject `none`   |
| Weak secret         | HS256 with short/guessable secret         | 256+ bit random secret, or use RS256/ES256    |
| Missing expiry      | No `exp` claim                            | Set `exp`, reject tokens without it           |
| No audience check   | Token for service A accepted by service B | Validate `aud` claim matches expected service |

```diff
- const payload = jwt.verify(token, secret);
+ const payload = jwt.verify(token, secret, {
+   algorithms: ['HS256'],
+   audience: 'api.myapp.com',
+   issuer: 'auth.myapp.com',
+ });
```
