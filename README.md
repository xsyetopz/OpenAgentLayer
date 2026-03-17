# ClaudeAgents

**7 agents, 10 skills, 12 hooks.** One plans, one codes, one reviews, one tests — you talk.

---

## Quick Start

```bash
# Plugin (recommended)
claude plugin install cca

# Manual
git clone https://github.com/xsyetopz/ClaudeAgents.git
cd ClaudeAgents
./install.sh --global --max
```

**Plugin** → skills get the `cca:` prefix (`/cca:review-code`).
**Manual** → bare names (`/review-code`).

---

## Marketplace

Manage the plugin via the CLI:

```bash
claude plugin install cca           # install from marketplace
claude plugin update cca            # update to latest version
claude plugin remove cca            # remove
claude plugin list                  # list installed plugins
claude plugin validate ./dist/...   # validate a local build
```

---

## Agents

| Who             | What                             | pro    | max    | enterprise |
| --------------- | -------------------------------- | ------ | ------ | ---------- |
| **@athena**     | Plans, designs, architects       | sonnet | opus   | opus       |
| **@hephaestus** | Writes code, fixes bugs          | sonnet | sonnet | sonnet     |
| **@nemesis**    | Reviews code, audits security    | sonnet | opus   | opus       |
| **@atalanta**   | Runs tests, finds root causes    | haiku  | haiku  | haiku      |
| **@calliope**   | Writes docs (markdown only)      | haiku  | haiku  | haiku      |
| **@hermes**     | Explores codebases, traces flows | sonnet | sonnet | sonnet     |
| **@odysseus**   | Coordinates multi-step tasks     | sonnet | opus   | opus       |

**`--pro`** = Sonnet everywhere (Haiku for tests/docs). **`--max`** = Opus for @athena, @nemesis, @odysseus. **`--enterprise`** = max + audit logs, DLP, compliance.

---

## Skills

**Slash commands.** Type them directly.

| What it does                    | Plugin                | Manual            |
| ------------------------------- | --------------------- | ----------------- |
| Code review                     | `/cca:review-code`    | `/review-code`    |
| Remove AI slop                  | `/cca:desloppify`     | `/desloppify`     |
| Commits, branches, PRs          | `/cca:ship`           | `/ship`           |
| Present options + tradeoffs     | `/cca:decide`         | `/decide`         |
| Security audit (OWASP)          | `/cca:audit-security` | `/audit-security` |
| Test strategy + coverage        | `/cca:test-patterns`  | `/test-patterns`  |
| Docs: READMEs, ADRs, changelogs | `/cca:document`       | `/document`       |
| Performance optimization        | `/cca:optimize`       | `/optimize`       |
| Error handling patterns         | `/cca:handle-errors`  | `/handle-errors`  |
| Session handoff                 | `/cca:session-export` | `/session-export` |

---

## Safety Rails

**All automatic. You configure nothing.**

| Hook                    | When                 | What it does                                              |
| ----------------------- | -------------------- | --------------------------------------------------------- |
| `pre-secrets`           | Before any tool      | Blocks .env reads, auth header leaks, force-push to main  |
| `pre-bash`              | Before shell         | Blocks commands that dump thousands of lines into context |
| `pre-schema`            | Before any tool      | Validates file paths and content before writes            |
| `post-write`            | After write/edit     | Auto-formats, catches placeholders and comment slop       |
| `post-bash`             | After shell          | Scrubs secrets and PII from command output                |
| `subagent-scan`         | Agent stop           | Catches incomplete work, stubs, silent scope reduction    |
| `stop-scan`             | Session end          | Catches incomplete work, stubs, silent scope reduction    |
| `check-scope-reduction` | Agent stop           | Blocks agents that quietly drop requirements              |
| `check-collaboration`   | Agent stop           | Catches sycophancy and single-option decisions            |
| `detect-workaround`     | Before tool          | Flags workaround patterns (--no-verify, force flags)      |
| `session-budget`        | Session start        | Warns when config files exceed line budgets               |
| `pre-post-proxy`        | Before + after tools | Forwards events to enterprise DLP server (opt-in)         |

Plus: LSP error check prompt after every file change, scope reduction prompt and collaboration protocol prompt on every agent stop.

---

## Install

Three tiers. Set at install time.

| Flag           | Models                                    | Use case                             |
| -------------- | ----------------------------------------- | ------------------------------------ |
| `--pro`        | Sonnet (Haiku for tests/docs)             | Everyday development                 |
| `--max`        | Opus for @athena, @nemesis, @odysseus     | Higher-stakes design and review work |
| `--enterprise` | Same as max + audit logs, DLP, compliance | Regulated environments               |

```bash
./install.sh /path/to/project --pro        # sonnet (haiku for atalanta/calliope)
./install.sh /path/to/project --max        # opus for athena/nemesis/odysseus
./install.sh /path/to/project --enterprise # max + audit logs, DLP, compliance
./install.sh /path/to/project --max --zen-mode  # composable zen constraints
./install.sh --global --pro                # ~/.claude/
```

---

## Enterprise HTTP Hooks

Forward all hook events to a central DLP/audit server.

```bash
export CCA_HTTP_HOOK_URL="https://dlp.internal/hooks"   # POST endpoint (unset = disabled)
export CCA_HTTP_HOOK_TOKEN="Bearer ..."                  # auth token (optional)
export CCA_HTTP_HOOK_FAIL_CLOSED=1                       # block on server unreachable (default: fail-open)
```

---

## Build from Source

```bash
./build-plugin.sh consumer    # or: enterprise, zen
```

Outputs to `dist/claude-agents-plugin/`. Test with:

```bash
claude --plugin-dir ./dist/claude-agents-plugin
```

---

## Uninstall

```bash
# Plugin
claude plugin uninstall cca

# Manual
./uninstall.sh --global          # or: ./uninstall.sh /path/to/project
```

---

## Requirements

Claude Code >= 2.1.75, Python 3, jq.

---

## License

MIT
