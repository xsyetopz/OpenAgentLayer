# OWASP Top 10 Checklist (2021)

Per-category: what to look for, vulnerable pattern, fix pattern, verification.

---

## A01 -- Broken Access Control

**What to look for**: Resource ownership not verified at the data layer. Auth checked at route only.

```diff
- @app.get("/documents/{doc_id}")
- @login_required
- def get_document(doc_id: int):
-     return db.get(Document, doc_id)  # any authenticated user gets any doc
+ @app.get("/documents/{doc_id}")
+ @login_required
+ def get_document(doc_id: int):
+     doc = db.get(Document, doc_id)
+     if doc.owner_id != current_user.id:
+         raise HTTPException(403)
+     return doc
```

**Check**: RBAC/ABAC permissions enforced at service/data layer, not UI/route only.

---

## A02 -- Cryptographic Failures

**What to look for**: Sensitive data unencrypted at rest, weak algorithms, secrets in transit.

```diff
- Password hashing: MD5, SHA-1, SHA-256
+ Password hashing: bcrypt, scrypt, argon2
- Encryption at rest: none, ROT13, base64
+ Encryption at rest: AES-256-GCM, ChaCha20
- Transport: HTTP, TLS 1.0/1.1
+ Transport: TLS 1.2+ only
- Token signing: HS256 with weak secret
+ Token signing: RS256, ES256, or a long random secret
```

```diff
- import hashlib
- password_hash = hashlib.md5(password.encode()).hexdigest()
+ from passlib.hash import argon2
+ password_hash = argon2.hash(password)
+ verified = argon2.verify(input_password, password_hash)
```

---

## A03 -- Injection

### SQL

```diff
- def get_user(username):
-     query = f"SELECT * FROM users WHERE username = '{username}'"
-     return db.execute(query)
+ def get_user(username):
+     return db.execute("SELECT * FROM users WHERE username = ?", [username])
```

### Command Injection

```diff
- import subprocess
- subprocess.run(f"convert {user_filename} output.png", shell=True)
+ import subprocess
+ subprocess.run(["convert", user_filename, "output.png"], shell=False)
```

### XSS

```diff
- element.innerHTML = userInput;
+ element.textContent = userInput;
+ // or: DOMPurify.sanitize(userInput) for HTML content
```

### Path Traversal

```diff
- with open(f"/uploads/{user_path}") as f: ...
+ import os
+ safe_root = "/uploads"
+ candidate = os.path.realpath(os.path.join(safe_root, user_path))
+ if not candidate.startswith(safe_root + os.sep):
+     raise PermissionError("path traversal")
```

---

## A04 -- Insecure Design

**What to look for**: Missing rate limits on sensitive operations. No account lockout. Password reset without secondary verification.

Checklist:

- [ ] Rate limiting on: login, registration, password reset, OTP, API keys
- [ ] Account lockout after N failed attempts (with unlock mechanism)
- [ ] Password reset uses time-limited tokens, not security questions
- [ ] Sensitive operations require re-authentication

---

## A05 -- Security Misconfiguration

**What to look for**: Debug mode in production. Default credentials. Verbose error messages.

```diff
- @app.errorhandler(500)
- def server_error(e):
-     return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500
+ @app.errorhandler(500)
+ def server_error(e):
+     log.exception("Internal error")
+     return jsonify({"error": "Internal server error"}), 500
```

Checklist:

- [ ] `DEBUG=False` in production
- [ ] No default passwords (admin/admin, root/root)
- [ ] Security headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`
- [ ] Directory listing disabled on web server
- [ ] Unused features/endpoints disabled

---

## A06 -- Vulnerable and Outdated Components

**Audit commands by ecosystem**:

```bash
bun audit --audit-level=high
cargo audit
pip-audit
bundle audit
trivy fs .                    # multi-language scanner
```

Checklist:

- [ ] No known CVEs in direct dependencies
- [ ] Lock files committed (package-lock.json, Cargo.lock, poetry.lock)
- [ ] Dependency update cadence defined (weekly/monthly bot or manual schedule)
- [ ] No packages abandoned >2 years without security track record

---

## A07 -- Identification and Authentication Failures

```diff
- const sessionToken = `session_${userId}_${Date.now()}`;
+ import { randomBytes } from 'crypto';
+ const sessionToken = randomBytes(32).toString('hex');  // 256 bits
```

Checklist:

- [ ] Session tokens: 128+ bits of randomness (`crypto.randomBytes`, `secrets.token_urlsafe`)
- [ ] JWT validated: signature, `exp`, `iss`, `aud`
- [ ] `HttpOnly` + `Secure` + `SameSite=Strict` on session cookies
- [ ] Sessions invalidated on logout and password change
- [ ] Multi-factor available for privileged operations

---

## A08 -- Software and Data Integrity Failures

**What to look for**: Deserializing untrusted data. CI/CD pipelines that run arbitrary code from third parties.

```diff
- import pickle
- obj = pickle.loads(user_data)  # RCE possible
-
- import yaml
- data = yaml.load(user_data)
+ import yaml
+ data = yaml.safe_load(user_data)
```

```diff
- JSON.parse(data, (key, value) => eval(value));
+ const raw = JSON.parse(data);
+ const validated = schema.parse(raw);  // zod/joi/yup
```

---

## A09 -- Security Logging and Monitoring Failures

Checklist:

- [ ] Auth events logged: login success/failure, password reset, MFA bypass
- [ ] Authorization failures logged with user ID + resource
- [ ] Logs include: timestamp, user, IP, action, result
- [ ] Logs do NOT include: passwords, tokens, PII beyond necessary
- [ ] Alerts configured for: repeated auth failures, privilege escalation, mass data access

---

## A10 -- Server-Side Request Forgery (SSRF)

```diff
- import requests
- def fetch_url(user_url):
-     return requests.get(user_url).text  # can hit 169.254.169.254, internal services
+ import ipaddress, socket
+ ALLOWED_HOSTS = {"api.example.com", "cdn.example.com"}
+
+ def fetch_url(user_url):
+     parsed = urllib.parse.urlparse(user_url)
+     if parsed.hostname not in ALLOWED_HOSTS:
+         raise ValueError("host not allowed")
+     ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
+     if ip.is_private or ip.is_loopback or ip.is_link_local:
+         raise ValueError("private/metadata IPs not allowed")
+     return requests.get(user_url).text
```

Block: `169.254.169.254` (AWS/GCP metadata), RFC-1918 ranges (10.x, 172.16-31.x, 192.168.x), `localhost`, `0.0.0.0`.
