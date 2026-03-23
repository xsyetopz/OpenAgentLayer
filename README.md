# ClaudeAgents

[![CI](https://github.com/xsyetopz/ClaudeAgents/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/ClaudeAgents/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**7 agents, 11 skills, 10 hooks.** One plans, one codes, one reviews, one tests -- you talk.

```bash
# Bootstrap (registers marketplace, installs user-level extras, then installs plugin)
git clone https://github.com/xsyetopz/ClaudeAgents && cd ClaudeAgents
./install.sh
```

---

## Why ClaudeAgents

Claude Code is powerful out of the box. ClaudeAgents adds:

- **Specialized agents** that know their role -- an architect won't write code, a reviewer won't fix bugs
- **Safety hooks** that catch placeholders, secrets, scope reduction, and sloppy AI prose automatically
- **Anti-rationalization gates** that prevent Claude from rationalizing incomplete work
- **Consistent models** — every subagent runs `opus[1m]`, orchestrator runs `opusplan`

---

## Architecture

```mermaid
graph TD
    User([User Request]) --> Odysseus["@odysseus (orchestrator)"]

    subgraph Agents [Specialized Agents]
        Athena["@athena (plan)"]
        Hephaestus["@hephaestus (build)"]
        Nemesis["@nemesis (review)"]
        Atalanta["@atalanta (test)"]
        Calliope["@calliope (docs)"]
        Hermes["@hermes (research)"]
    end

    Odysseus -- delegates to --> Agents

    Odysseus --> Hooks["Safety Hooks (10 lifecycle hooks)"]

    subgraph Events [Lifecycle Hooks]
        direction TB
        PreToolUse["<b>PreToolUse</b>: block dangerous commands, validate schemas"]
        PostToolUse["<b>PostToolUse</b>: auto-format, detect placeholders, redact secrets"]
        SubagentStop["<b>SubagentStop</b>: catch scope reduction, enforce protocol"]
        Stop["<b>Stop</b>: anti-rationalization gate, completion check"]
        SessionStart["<b>SessionStart</b>: context budget warning, git context injection"]
        UserPromptSubmit["<b>UserPromptSubmit</b>: prompt validation"]
        PostToolUseFailure["<b>PostToolUseFailure</b>: retry loop detection"]
    end

    Hooks --> Events
```

---

## Plugin Management

```bash
claude plugin install cca@claude-agents   # install (done by bootstrap)
claude plugin update cca@claude-agents    # update to latest
claude plugin uninstall cca@claude-agents # remove
claude plugin list                        # list installed
```

---

## Agents

| Who             | What                             | Model    |
| --------------- | -------------------------------- | -------- |
| **@athena**     | Plans, designs, architects       | opus[1m] |
| **@hephaestus** | Writes code, fixes bugs          | opus[1m] |
| **@nemesis**    | Reviews code, audits security    | opus[1m] |
| **@atalanta**   | Runs tests, finds root causes    | opus[1m] |
| **@calliope**   | Writes docs (markdown only)      | opus[1m] |
| **@hermes**     | Explores codebases, traces flows | opus[1m] |
| **@odysseus**   | Coordinates multi-step tasks     | opusplan |

---

## Skills

| What it does                    | Command           |
| ------------------------------- | ----------------- |
| Code review                     | `/cca:review`     |
| Remove AI slop                  | `/cca:desloppify` |
| Commits, branches, PRs          | `/cca:ship`       |
| Present options + tradeoffs     | `/cca:decide`     |
| Security audit (OWASP)          | `/cca:security`   |
| Test strategy + coverage        | `/cca:test`       |
| Docs: READMEs, ADRs, changelogs | `/cca:docs`       |
| Performance optimization        | `/cca:perf`       |
| Error handling patterns         | `/cca:errors`     |
| Session handoff                 | `/cca:handoff`    |
| Code style detection            | `/cca:style`      |

---

## Safety Rails

**All hook lifecycle events covered.** All automatic.

| Hook                 | When              | What it does                                             |
| -------------------- | ----------------- | -------------------------------------------------------- |
| `pre-secrets`        | Before any tool   | Blocks .env reads, auth header leaks, force-push to main |
| `pre-bash`           | Before shell      | Blocks dangerous commands, DNS exfil, blanket git add    |
| `pre-stream-guard`   | Before tool use   | Blocks secret-exposing commands during livestreams       |
| `pre-schema`         | Before any tool   | Validates file paths and content                         |
| `post-write`         | After write/edit  | Auto-formats, catches placeholders and comment slop      |
| `post-bash`          | After shell       | Scrubs secrets and PII from output                       |
| `post-failure`       | After tool error  | Detects retry loops, suggests alternatives               |
| `user-prompt-submit` | User sends prompt | Git context injection                                    |
| `subagent-scan`      | Agent stop        | Catches stubs, silent scope reduction                    |
| `stop-scan`          | Session end       | Anti-rationalization gate, completion check              |
| `session-budget`     | Session start     | Warns when config files exceed line budgets              |
| `session-stream`     | Session start     | Injects streaming safety instructions into LLM context   |

Plus: LSP error check prompt after every file change, scope reduction and collaboration protocol prompts on every agent stop.

---

## Install

```bash
# Bootstrap: registers marketplace, installs user-level extras, installs plugin
git clone https://github.com/xsyetopz/ClaudeAgents && cd ClaudeAgents
./install.sh               # all agents on opus[1m]
./install.sh --skip-rtk    # skip RTK token-savings tool
```

---

## Stream Guard (Livestream Protection)

Activate 4-layer secret redaction when streaming on Twitch/YouTube:

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export CCA_STREAM_MODE=1
alias claude-stream='CCA_STREAM_MODE=1 node ~/CodeProjects/ClaudeAgents/bin/stream-guard claude'
```

Replace `~/CodeProjects/ClaudeAgents` with wherever you cloned the repo.

| Layer | What                           | How                                                       |
| ----- | ------------------------------ | --------------------------------------------------------- |
| 1     | Block secret-exposing commands | PreToolUse denies `env`, `cat .env`, `echo $SECRET`, etc. |
| 2     | Flag secrets in tool output    | PostToolUse scans for .env values + secret patterns       |
| 3     | Safety context injection       | SessionStart instructs model to never output secrets      |
| 4     | Real-time stdout redaction     | PTY proxy rewrites secrets before they reach terminal/OBS |

Layers 1-3 run as Claude Code hooks. Layer 4 wraps the `claude` process externally.

```bash
CCA_STREAM_MODE=1 node /absolute/path/to/bin/stream-guard claude
claude-stream
```

Unset `CCA_STREAM_MODE` or set to `0` to disable all stream-guard hooks.

All stream-guard hooks are no-ops when `CCA_STREAM_MODE` is unset.

Configure via `.streamguardrc.json` in your project or home directory:

```json
{
  "envFiles": [".env", ".env.local"],
  "customPatterns": [{ "regex": "my-corp-token-[a-z0-9]+", "name": "CorpToken" }],
  "safeEnvPrefixes": ["PUBLIC_", "NEXT_PUBLIC_", "VITE_"]
}
```

---

## Enterprise HTTP Hooks

Forward all hook events to a central DLP/audit server.

```bash
export CCA_HTTP_HOOK_URL="https://dlp.internal/hooks"
export CCA_HTTP_HOOK_TOKEN="Bearer ..."
export CCA_HTTP_HOOK_FAIL_CLOSED=1
```

## Audit Logging

Enable JSON-line audit logging for all hooks:

```bash
export CCA_HOOK_LOG_DIR="/var/log/cca"
```

Writes to `$CCA_HOOK_LOG_DIR/cca-hooks.jsonl`:

```json
{"ts":"2026-03-17T12:00:00Z","event":"PreToolUse","tool":"Bash","action":"blocked","reason":"rm -rf pattern","hook":"pre-bash.mjs"}
```

---

## Development

```bash
make lint      # shellcheck + jsonlint
make test      # node --test (121 tests)
make build     # build plugin
make validate  # lint + test + build
```

---

## Uninstall

```bash
./uninstall.sh --global              # removes plugin, user-level files, cleans settings
./uninstall.sh /path/to/project      # removes project-level files
```

---

## Requirements

Claude Code >= 2.1.75, Node.js >= 18, jq (optional).

---

## License

MIT
