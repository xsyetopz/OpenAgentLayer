# ClaudeAgents

**7 AI agents that specialise so you don't have to.** One plans, one codes, one reviews, one tests - you just talk.

---

## Install

```bash
git clone https://github.com/xsyetopz/ClaudeAgents.git
cd ClaudeAgents
./install.sh --global --max
```

This registers the marketplace, enables the plugin, installs agents/skills/hooks, and configures permissions. After install, `claude plugin install cca` works for future updates.

---

## Meet Your Agents

- **@athena** - designs architecture, breaks down tasks, plans before code gets written
- **@hephaestus** - writes code, fixes bugs, builds features (follows plans when given one)
- **@nemesis** - reviews code, audits security, checks performance (reports problems, never fixes them)
- **@atalanta** - runs tests, parses failures, finds root causes (read-only, diagnosis only)
- **@calliope** - writes and edits documentation (markdown only, no source code)
- **@hermes** - explores codebases, traces data flows, cites file:line for every claim
- **@odysseus** - coordinates multi-step tasks by delegating to the right agent

---

## Skills

**Type any of these as slash commands:**

- **/cca:review-code** - structured code review with severity ratings
- **/cca:desloppify** - find and fix AI-generated slop (filler words, obvious comments, placeholder code)
- **/cca:ship** - commits, branches, PRs with Conventional Commits
- **/cca:decide** - present 2-3 options with tradeoffs for any decision
- **/cca:audit-security** - OWASP-style security audit with file:line citations
- **/cca:test-patterns** - test strategy, coverage analysis, test writing guidance
- **/cca:document** - READMEs, changelogs, ADRs, API docs
- **/cca:optimize** - performance profiling and optimization recommendations
- **/cca:handle-errors** - error handling patterns (Result types, exceptions, retries)
- **/cca:session-export** - save a handoff file so your next session picks up where you left off
- **/cca:commit** - quick commits with quality checks

---

## Safety Rails

**These run automatically. You don't need to do anything.**

- **Secrets stay secret** - blocks reading .env files, echoing auth headers, force-pushing to main
- **No giant outputs** - stops commands that would dump thousands of lines into context
- **Code gets formatted** - auto-formats files after every write/edit
- **Placeholders get caught** - scans for TODO, FIXME, stub code, and "simplified version" patterns
- **Scope stays honest** - detects when an agent silently drops part of what you asked for
- **Types get checked** - prompts to fix LSP errors after every file change

### Manual install

```bash
./install.sh /path/to/project --pro
```

**`--pro`** uses Sonnet for all agents (Haiku for tests/docs). **`--max`** upgrades @athena and @odysseus to Opus.

```bash
./install.sh /path/to/project --max
./install.sh --global --pro
```

Requires: Claude Code >= 2.1.75, Python 3, jq.

### Build plugin from source

```bash
./build-plugin.sh pro
```

Outputs to `dist/claude-agents-plugin/`. Test with `claude --plugin-dir ./dist/claude-agents-plugin`.

### Model tiers

| Agent         | Pro    | Max    |
| ------------- | ------ | ------ |
| @athena       | sonnet | opus   |
| @hephaestus   | sonnet | sonnet |
| @nemesis      | sonnet | sonnet |
| @atalanta     | haiku  | haiku  |
| @calliope     | haiku  | haiku  |
| @hermes       | sonnet | sonnet |
| @odysseus     | sonnet | opus   |

### Uninstall

```bash
claude plugin uninstall cca
```

For manual installs, delete the `.claude/agents/`, `.claude/skills/cca/`, and `.claude/hooks/` directories.

---

## License

MIT
