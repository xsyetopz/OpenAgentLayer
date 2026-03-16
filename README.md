# ClaudeAgents

Agent definitions, skills, and hooks for Claude Code. Targets CC v2.1.75+.

## What's Included

- **7 agents** - athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus
- **11 skills** (ca: prefix) - review-code, desloppify, ship, decide, audit-security, test-patterns, document, optimize, handle-errors, session-export, commit
- **6 hook scripts** - guard-secrets, guard-commands, check-budget, validate-write, scan-completion, _lib
- **Template CLAUDE.md** - collaboration protocol and behavioral constraints for target projects

## Install

### Plugin (recommended)

```bash
claude plugin install ca
```

Plugins auto-discover agents, skills, and hooks. No file copying needed.

**Note**: Plugins don't support `permissions.deny` or `env` vars. After installing, add to your project's `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "deny": ["Agent(Explore)", "Agent(Plan)", "Agent(general-purpose)"]
  }
}
```

The SessionStart hook will warn if these are missing.

### Manual install

```bash
# To a project (Pro tier - all sonnet, haiku for test/docs)
./install.sh /path/to/project --pro

# To a project (Max tier - opus for athena/odysseus, sonnet for rest)
./install.sh /path/to/project --max

# Global install
./install.sh --global --pro
```

Requires: Claude Code >= 2.1.75, Python 3, jq.

The installer:

- Checks Claude Code version >= 2.1.75
- Validates Python 3 is available (required by hook scripts)
- Detects and warns about plugin/manual install conflicts
- Removes old agent and skill files from previous versions
- Copies agents with model substitution based on tier
- Copies all 11 skills to `.claude/skills/ca/`
- Installs guard-secrets hook to `~/.claude/hooks/` (user-level)
- Bulk copies hook scripts to `.claude/hooks/scripts/` (project-level)
- Merges `settings.json` via `jq` (appends, never replaces)
- Copies `CLAUDE.md` template to project root (skips if exists)
- Validates: JSON, Python syntax, skill structure, model placeholders, shared-constraints injection

### Build plugin from source

```bash
./build-plugin.sh          # Default: max tier
./build-plugin.sh pro      # Pro tier
```

Outputs to `dist/claude-agents-plugin/`. Test locally with `claude --plugin-dir ./dist/claude-agents-plugin`.

## Agents

| Agent         | Pro Model | Max Model | Purpose                                  |
| ------------- | --------- | --------- | ---------------------------------------- |
| `@athena`     | sonnet    | opus      | Design, plan, architect                  |
| `@hephaestus` | sonnet    | sonnet    | Write code, fix bugs, build features     |
| `@nemesis`    | sonnet    | sonnet    | Review code, security audit              |
| `@atalanta`   | haiku     | haiku     | Run tests, parse failures, root causes   |
| `@calliope`   | haiku     | haiku     | Write/edit documentation (markdown only) |
| `@hermes`     | sonnet    | sonnet    | Research, explore codebase, cite sources |
| `@odysseus`   | sonnet    | opus      | Multi-step delegation, progress tracking |

## Skills

| Skill            | Slash Command        | Triggers                                     |
| ---------------- | -------------------- | -------------------------------------------- |
| `review-code`    | `/ca:review-code`    | Writing, editing, or reviewing code          |
| `desloppify`     | `/ca:desloppify`     | AI slop detection, "clean up", comment audit |
| `ship`           | `/ca:ship`           | Commits, branches, PRs, git workflow         |
| `decide`         | `/ca:decide`         | Decision making, tradeoffs, options          |
| `audit-security` | `/ca:audit-security` | Security audit, OWASP, vulnerabilities       |
| `test-patterns`  | `/ca:test-patterns`  | Writing tests, test strategy, coverage       |
| `document`       | `/ca:document`       | READMEs, changelogs, ADRs, API docs          |
| `optimize`       | `/ca:optimize`       | Performance, optimization, profiling         |
| `handle-errors`  | `/ca:handle-errors`  | Error handling, Result types, exceptions     |
| `session-export` | `/ca:session-export` | Session handoff, context preservation        |
| `commit`         | `/ca:commit`         | Quick commits with Conventional Commits      |

## Hooks

**User-level** (`~/.claude/hooks/`):

| Hook             | Event      | What It Does                                                  |
| ---------------- | ---------- | ------------------------------------------------------------- |
| guard-secrets.py | PreToolUse | Blocks .env reads/writes, auth-header echoes, force-push main |

**Project-level** (`.claude/hooks.json`):

| Hook / Prompt      | Event                    | What It Does                                        |
| ------------------ | ------------------------ | --------------------------------------------------- |
| check-budget.py    | SessionStart             | Warns when CLAUDE.md/MEMORY.md exceeds line budget  |
| guard-commands.py  | PreToolUse (Bash)        | Blocks large-output commands, commit quality checks |
| validate-write.py  | PostToolUse (Write/Edit) | Auto-format, placeholder detection, comment slop    |
| scan-completion.py | SubagentStop, Stop       | Scans modified files for placeholder patterns       |
| LSP diagnostics    | PostToolUse (prompt)     | Prompts to check and fix type errors                |
| scope-check        | SubagentStop (prompt)    | Detects silent scope reduction by agents            |

## License

MIT
