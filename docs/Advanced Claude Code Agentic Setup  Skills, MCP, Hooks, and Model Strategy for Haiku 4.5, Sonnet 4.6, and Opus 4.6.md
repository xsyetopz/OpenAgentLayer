# Advanced Claude Code Agentic Setup: Skills, MCP, Hooks, and Model Strategy

## 1. Issue #17271 and Current Workarounds

GitHub issue [anthropics/claude-code#17271](https://github.com/anthropics/claude-code/issues/17271) describes a bug where **plugin skills** do not appear in the `/` slash-command autocomplete menu even though project skills in `.claude/skills` do. Root-cause analysis from community comments shows that plugin skills are loaded through a different code path from directory skills and that two factors interact badly:
- The `name` field in SKILL frontmatter strips the plugin namespace prefix when used as a command identifier (e.g., `name: my-skill` becomes `/my-skill` instead of `/plugin:my-skill`).
- For plugin skills, `user-invocable` frontmatter is effectively ignored in some versions, so skills default to `isHidden: true`, which hides them from `/help` and slash autocomplete regardless of `user-invocable: true`.

Several workarounds were discovered before the upstream fix landed.
One widely used workaround symlinked `SKILL.md` to a filename-based command path and registered that file under `commands` in the plugin manifest, preserving auto-activation via the skills array while making a visible slash command.
A later and simpler workaround removed the `name` frontmatter field entirely so that Claude used the directory name as the skill name and preserved the `/plugin-name:skill-name` prefix in autocomplete.

Claude Code 2.1.29 and later appear to have shipped a fix that restores correct behavior for plugin skills in autocomplete without workarounds.
Multiple commenters confirm that after upgrading to v2.1.29 they could remove symlinks and `commands`-array hacks and still see `/plugin-name:skill` entries show up as expected.
However, for older versions or edge cases, removing the `name` field from plugin SKILL frontmatter remains a low-friction workaround.

## 2. Designing Effective `.claude/skills` for Agentic Coding

Official docs describe **skills** as structured capabilities that extend what Claude can do, discovered automatically from `~/.claude/skills` (user scope), `.claude/skills` (project scope), additional directories added via `--add-dir`, and from plugins.[^1]
Each skill is a directory whose entrypoint is `SKILL.md`, containing YAML frontmatter and Markdown instructions, plus any supporting files such as reference docs, templates, or scripts.[^1]
Claude lists available skills in a `Skill` tool description, chooses when to invoke them based on their descriptions, and, when invoked, loads the SKILL content into context, possibly constraining tools or even delegating to subagents.[^2][^3]

### 2.1 Recommended directory and file layout

A robust, extensible skill should follow the pattern shown in the docs:

```text
.claude/skills/
  explain-code/
    SKILL.md            # required frontmatter + core prompt
    reference.md        # API or domain docs
    examples.md         # few-shot formats and worked examples
    scripts/
      analyze.py        # Python helpers invoked via Bash
```

Docs recommend **one SKILL.md per directory**; supporting files are referenced from SKILL.md so Claude knows what they contain and when to read or execute them.[^3][^1]
For agentic coding workflows, it is effective to:
- Keep SKILL.md focused on orchestration instructions and behavioral constraints.
- Put heavy reference text (e.g., architectural standards, style guides) into separate `reference.md` files that Claude reads on demand via `Read`.
- Put deterministic steps (lint, tests, code-mods, analyzers) into `scripts/` and explicitly instruct Claude to run them via Bash, then interpret the results.[^3]

### 2.2 Frontmatter fields for coding-focused skills

The skills reference describes several important fields:[^1]

- `name`: Optional; becomes the `/slash-command`. For plugin skills this field has historically caused namespace stripping; omitting it lets Claude infer the command from the directory name and keeps the plugin prefix (e.g., `/plugin:skill-name`).
- `description`: Short, high-signal summary used in the skills list; this is the main text Claude uses to decide when to auto-load the skill.[^1]
- `user-invocable`: When `true`, the skill appears in `/skills` and slash autocomplete; when `false`, it can still be auto-invoked but is hidden from the menu.[^1]
- `allowed-tools`: Optional whitelist of tools the model may use while the skill is active (e.g., `Read, Edit, Write, Bash, WebFetch`).[^4]
- `agent`: If set, the skill can run in a subagent context instead of the main agent, useful for heavy analysis or large-context work.[^5]
- `model`: For plugin or advanced skills, you can point to a specific model (e.g., `opus`, `sonnet`, `haiku`, or full IDs such as `claude-opus-4-6`) so the skill runs under a stronger or cheaper model as needed.[^5]

For AI agentic coding, frontmatter should clearly encode **domain**, **mode**, and **capabilities**, for example:

```yaml
---
name: monorepo-refactor
description: "Expert refactoring assistant for large TypeScript monorepos with strict safety and test enforcement"
user-invocable: true
model: opus          # or sonnet/haiku depending on cost/quality needs
agent: monorepo-refactor-agent
allowed-tools: [Read, Edit, Write, Bash, Grep, Glob, WebSearch]
---
```

Docs and community deep dives emphasize that skill selection is entirely prompt-based: all skills are formatted into text and passed through a `Skill` tool schema, and Claude’s reasoning—not application code—decides which skills to invoke.[^2][^3]
This means careful frontmatter descriptions, concise but distinctive wording, and clear scope boundaries are the primary levers for reliable auto-selection.

### 2.3 Prompt-engineering patterns inside SKILL.md

Within SKILL.md, best-practice patterns for agentic coding skills include:[^3][^1]

- **Role and invariants**: Start with explicit “you are” instructions, coding conventions, safety constraints, and non-negotiables (tests must pass, diff must be minimal, no unrelated refactors).
- **Stepwise procedure**: Declare a numbered workflow (plan → inspect code → run scripts → propose edits → apply edits → verify) that the model is expected to follow on each invocation.
- **Tool usage contracts**: Include do/don’t guidance for Bash, Read, Edit, Write, Grep, and external MCP tools (e.g., “always use Read instead of cat”, “never run destructive commands without explicit permission”).[^6]
- **Subagent delegation**: If the skill is paired with a custom subagent, describe when and how to call `Agent` or `Task` tools with `subagent_type` set to that agent (for example, offloading long-running exploration or test runs to background tasks).[^5]
- **Strong examples**: Provide short, well-annotated examples showing inputs and expected outputs (e.g., review comments format, commit message templates) so Claude has a target format to imitate.

Since the skill body becomes part of the model’s system prompt when active, it is generally better to keep the **main instructions stable** and treat per-project guidance (e.g., framework-specific conventions) as reference attachments or `.claude/rules/*.md` files so they can be reused across skills.[^7]

## 3. Structuring `.claude/mcp` and `.mcp.json` for Tooling

Claude Code uses the **Model Context Protocol (MCP)** to connect tools such as issue trackers, documentation systems, internal APIs, and other services.[^8][^6]
MCP servers can be registered at user scope (in `~/.claude.json`), project scope (via `.mcp.json` in the project root), local project settings, or enterprise-managed `managed-mcp.json` with highest precedence.[^9][^8]
Project-scoped `.mcp.json` is the recommended way to share MCP configuration with a team via version control.[^8]

Docs give examples of JSON entries for both HTTP and stdio servers:[^10][^8]

```json
{
  "mcpServers": {
    "github-issues": {
      "type": "http",
      "url": "https://api.yourcompany.com/mcp/github-issues",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    },
    "internal-cli": {
      "type": "stdio",
      "command": "./bin/internal-mcp",
      "args": ["--project", "${CLAUDE_PROJECT_DIR}"],
      "env": { "ENV": "dev" }
    }
  }
}
```

Key design principles for `.claude/mcp` and `.mcp.json` in agentic coding setups:

- **Scope deliberately**: Use `.mcp.json` for project-specific servers and `~/.claude.json` for personal or cross-project servers; rely on managed `managed-mcp.json` only when administrators must enforce a global MCP allowlist.[^9][^8]
- **Security first**: For project MCP, consider settings such as `enableAllProjectMcpServers`, `enabledMcpjsonServers`, or `disabledMcpjsonServers` in `.claude/settings.json` to whitelist or blacklist project-defined servers.[^9]
- **Environment variables for secrets**: Put tokens in environment variables and reference them via `${VAR}` expansion rather than hard-coding secrets in JSON.[^10][^8]
- **Model-aware tools**: When MCP tools trigger heavy LLM usage (e.g., internal code analyzers that call back into Claude), align their configuration with your model strategy so they don’t accidentally run expensive Opus calls for trivial tasks.

For complex stacks of tools, the recommended approach is to let Claude discover MCP tools but use **permissions and hooks** (see next section) to gate or steer their usage rather than trying to fully encode routing in MCP itself.[^11]

## 4. Hooks and `.claude/hooks` for Deterministic Control

Hooks are user-defined shell commands, HTTP endpoints, or LLM prompts that execute automatically at specific lifecycle events such as `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, and many others.[^12][^13]
They are configured in `~/.claude/settings.json` (user scope), `.claude/settings.json` (project scope), `.claude/settings.local.json` (local only), managed settings, or plugin `hooks/hooks.json`; skills and agents can also embed scoped hooks in frontmatter.[^13][^12]

While hooks live in JSON settings files, it is common practice to store **shell or Python scripts** under `.claude/hooks/` and reference them via environment variables like `$CLAUDE_PROJECT_DIR` and `${CLAUDE_PLUGIN_ROOT}` so paths remain stable regardless of working directory.[^12][^13]
For example, docs show a `protect-files.sh` script referenced from a `PreToolUse` hook that matches `Edit|Write` to guard against unwanted modifications.[^12]

### 4.1 Structuring hooks for agentic coding

For sophisticated agent workflows, hooks can enforce guardrails and automate routine steps:

- **PreToolUse (Edit/Write)**: Run formatting, linting, or security scans before accepting edits, potentially blocking the action if checks fail.[^14][^13]
- **PostToolUse (Bash)**: Inspect command outputs, e.g., fail the session or send notifications if tests fail or coverage drops.[^15][^13]
- **TaskCompleted / TeammateIdle / SubagentStop**: Trigger notifications, summarization scripts, or artifact exports when long-running agents or background tasks finish.[^15]
- **InstructionsLoaded**: Log or validate when CLAUDE.md and rules files are loaded, useful in regulated environments or for debugging prompt configuration.[^13][^12]

A typical `.claude/hooks` layout for Python and Bash scripts looks like:

```text
.claude/hooks/
  protect-files.sh
  run-tests.sh
  summarize-diff.py
.claude/settings.json
```

And the hooks section in `.claude/settings.json` might resemble:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-tests.sh"
          }
        ]
      }
    ]
  }
}
```

Guides stress that hooks are **deterministic glue**: they ensure that formatting, tests, or policy checks always run instead of relying on the model to remember instructions inside prompts.[^16][^14]
This is particularly valuable in complex agentic coding pipelines where forgetting one step can cause subtle regressions.

## 5. Prompting and Model Injection for Agentic Coding

Claude Code offers several ways to control which models are used where:

- `/model` command and the model picker for the **orchestrator model** in the current session.
- Agent frontmatter `model` field for custom subagents defined in `.claude/agents/*.md` and for JSON-defined agents via `--agents`.[^4][^5]
- Skill frontmatter `model` and `agent` fields to run a skill under a particular model or delegate to a specific subagent.[^1]
- `modelOverrides` and `availableModels` settings, plus `ANTHROPIC_DEFAULT_*_MODEL` environment variables, to map logical model names to provider-specific IDs (e.g., Bedrock inference profiles).[^17]

The subagents documentation explicitly lists `model` as a supported field, allowing values like `sonnet`, `opus`, `haiku`, full Anthropic IDs (e.g., `claude-opus-4-6`), or `inherit` (use the main session model).[^5]
The frontmatter body becomes the subagent’s system prompt, and the agent receives only that system prompt plus environment details, not the full Claude Code system prompt.[^5]

### 5.1 Designing an orchestrator + specialist model strategy

Anthropic’s model documentation and product announcements characterize the three main families as:

- **Opus 4.6**: Frontier flagship with the strongest reasoning, best at complex coding, planning, multi-step agents, and large codebases; supports 1M-token context and up to 128k output tokens in beta.[^18][^19]
- **Sonnet 4.6**: High-capability mid-tier model optimized for coding, computer use, design, knowledge work, and long-context reasoning; Sonnet 4.6 is now the default for free and Pro users and also offers a 1M context window in beta.[^20][^21]
- **Haiku 4.5**: Small, low-latency, cost-effective model providing near-frontier performance at lower price, good for real-time agents and high-throughput workloads; supports a 200k context window and extended thinking.[^22][^23]

Anthropic suggests pairing Sonnet as an orchestrator with Haiku as an execution engine for parallel subtasks, and using Opus when highest intelligence or hardest tasks justify the extra cost.[^24][^23]
Claude Code changelog entries mirror this, with features such as Haiku 4.5 using Sonnet for plan mode by default, and Sonnet 4.6 and Opus 4.6 gaining 1M context support and adaptive/extended thinking options.

A practical pattern for agentic coding is:

- Use **Sonnet 4.6 as the main orchestrator** (`/model sonnet`) for most day-to-day development tasks.
- Define specialized subagents in `.claude/agents` with `model: haiku` for fast, cheap subtasks (searching the codebase, quick refactors, test triage) and `model: opus` for rare but challenging missions (deep refactors, cross-repo changes, complex design changes).
- Let skills choose which agents to call via `Agent`/`Task` tools based on task difficulty, encoded in prompts.

### 5.2 Workarounds for model or tool quirks

Real-world issues with model behavior in Claude Code appear in the issue tracker and changelog.
For example, there have been cases where subagents with `model: sonnet` lost specific tools like `Write` while the same configuration worked with `model: opus`.[^25]
In such situations, a common workaround is to:

- Temporarily set `model: opus` for the affected agent until the bug is fixed.
- Or spawn a generic agent with Sonnet using the same instructions embedded in its system prompt, at the cost of losing the distinct agent identity.[^25]

Another class of issues concerns **model selection precedence**.
Environment variables such as `ANTHROPIC_MODEL` can override the `/model` setting, causing Claude Code to reset the model on startup to what the project’s `.env` specifies.[^26]
When building a custom agent stack, it is advisable to:

- Avoid setting `ANTHROPIC_MODEL` in your application `.env` if you want Claude Code to be free to use different models.
- Instead, configure Claude’s own model via `/model`, `settings.json` (per-project or user), or `modelOverrides` plus family-level settings like `ANTHROPIC_DEFAULT_OPUS_MODEL`.[^17][^26]

Finally, the changelog documents that some older versions silently downgraded subagents using `model: opus`/`sonnet`/`haiku` to older model versions on certain providers, which has been fixed in recent releases.
Upgrading Claude Code and specifying full model IDs (like `claude-opus-4-6`) where critical can avoid unexpected fallbacks.

## 6. Putting It Together: Patterns for Python and Bash-based Skills

With the above primitives, highly agentic coding flows can be built using a combination of skills, MCP servers, hooks, and subagents.
Patterns emerging from docs and community guides include:[^27][^3][^1]

- **Python-backed analysis skills**: A skill’s SKILL.md instructs Claude to run `python3 scripts/analyze_repo.py` via Bash with arguments derived from the user query, parse JSON output, and then propose code changes using Edit/Write.
- **Bash-based automation wrappers**: For tasks like running test suites, formatting, or security scans, SKILL.md delegates to shell scripts (e.g., `.claude/hooks/run-tests.sh`) and treats their output as constraints on allowed edits.
- **MCP-aware agents**: Subagents configured with tools restricted to particular MCP servers (e.g., `github-issues`, `incident-tracker`) focus on narrow tasks like triaging bugs or updating tickets.
- **Hook-led guardrails**: PreToolUse/Edit hooks call Python or Bash scripts to enforce invariants like “no direct writes outside src/ and tests/” or “block edits to generated files”.[^14][^13]

In all these patterns, prompt engineering is encoded into **Markdown plus frontmatter**, not into opaque code.
Lifecycles and safety are handled by hooks and permissions, while MCP integrates external systems and model configuration selects the right intelligence and cost profile per agent.
This separation of concerns makes `.claude/skills`, `.claude/mcp`/`.mcp.json`, and `.claude/hooks` powerful levers for building maintainable, deeply agentic coding setups around Haiku 4.5, Sonnet 4.6, and Opus 4.6.

---

## References

1. [Extend Claude with skills - Claude Code Docs](https://code.claude.com/docs/en/skills) - Create, manage, and share skills to extend Claude's capabilities in Claude Code. Includes custom com...

2. [Inside Claude Code Skills: Structure, prompts, invocation](https://mikhail.io/2025/10/claude-code-skills/) - From this point, Claude Code follows the expanded instructions: it runs the extraction script, proce...

3. [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) - Claude uses Skills to improve how it performs specific tasks. Skills are defined as folders that inc...

4. [Agent SDK overview - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/overview) - Build production AI agents with Claude Code as a library

5. [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents) - The --agents flag accepts JSON with the same frontmatter fields as file-based subagents: description...

6. [Claude Code overview - Claude Code Docs](https://code.claude.com/docs/en/overview) - Claude Code is an agentic coding tool that reads your codebase, edits files, runs commands, and inte...

7. [CLAUDE.md, Slash Commands, Skills, and Subagents](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) - The complete guide to customizing Claude Code. Compare CLAUDE.md, slash commands, skills, and subage...

8. [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp) - Learn how to connect Claude Code to your tools with the Model Context Protocol.

9. [Claude Code Configuration Guide](https://www.claudelog.com/configuration/) - Master Claude Code configuration with this comprehensive guide. From API keys and model selection to...

10. [Set Up MCP with Claude Code](https://developer.sailpoint.com/docs/extensibility/mcp/integrations/claude-code/) - Set Up MCP with Claude Code · Step 1: Set Up Authentication​ · Step 2: Add the MCP Server to Claude ...

11. [How to turn Claude Code into a domain specific coding agent](https://blog.langchain.com/how-to-turn-claude-code-into-a-domain-specific-coding-agent/) - Claude + Claude.md + MCP wins: While Claude.md provides the most mileage per token, the strongest re...

12. [Automate workflows with hooks - Claude Code Docs](https://code.claude.com/docs/en/hooks-guide) - Hooks let you run code at key points in Claude Code's lifecycle: format files after edits, block com...

13. [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks) - Hooks are user-defined shell commands, HTTP endpoints, or LLM prompts that execute automatically at ...

14. [Claude Code hooks: A practical guide with examples (2026)](https://www.eesel.ai/blog/hooks-in-claude-code) - Hooks in Claude Code are automated triggers that run shell commands at specific points in Claude's o...

15. [Claude Code Hooks Mastery: Deterministic AI Control & ...](https://yuv.ai/blog/claude-code-hooks-mastery) - Claude Code Hooks Mastery is a comprehensive toolkit that provides 13 lifecycle hooks for controllin...

16. [Claude Code Hooks: A Practical Guide to Workflow ...](https://www.datacamp.com/tutorial/claude-code-hooks) - Claude Code Hooks are shell commands that run automatically when specific events happen during your ...

17. [Model configuration - Claude Code Docs](https://code.claude.com/docs/en/model-config) - Learn about the Claude Code model configuration, including model aliases like opusplan

18. [Introducing Claude Opus 4.6](https://www.anthropic.com/news/claude-opus-4-6) - The new Claude Opus 4.6 improves on its predecessor's coding skills. It plans more carefully, sustai...

19. [Claude Opus 4.6](https://www.anthropic.com/claude/opus) - Announcements · NEW. Claude Opus 4.6. Feb 5, 2026 · Claude Opus 4.5. Nov 24, 2025. Claude Opus 4.5 i...

20. [Introducing Claude Sonnet 4.6](https://www.anthropic.com/news/claude-sonnet-4-6) - Claude Sonnet 4.6 hit 94% on our insurance benchmark, making it the highest-performing model we've t...

21. [Anthropic Unveils Claude Sonnet 4.6 with a Million-Token ...](https://forklog.com/en/anthropic-unveils-claude-sonnet-4-6-with-a-million-token-context-window/) - Anthropic has released an updated mid-level AI model, Sonnet, focusing on programming skills, instru...

22. [Claude Haiku 4.5: Features, Testing Results, and Use Cases](https://www.datacamp.com/fr/blog/anthropic-claude-haiku-4-5) - The results show that Claude Haiku 4.5 achieved 73.3% accuracy, the highest after Claude Sonnet 4.5,...

23. [Introducing Claude Haiku 4.5](https://www.anthropic.com/news/claude-haiku-4-5) - Claude Haiku 4.5 gives users a new option for when they want near-frontier performance with much gre...

24. [Anthropic Claude Models Complete Guide - Sonnet 4.5](https://www.codegpt.co/blog/anthropic-claude-models-complete-guide) - Haiku 4.5 delivers "near-frontier performance", reportedly achieving the "same level of coding skill...

25. [Custom agent with model: sonnet loses tools declared in ...](https://github.com/anthropics/claude-code/issues/30106) - Custom agents defined in .claude/agents/ with model: sonnet do not receive all tools declared in the...

26. [[BUG] .env value overriding model setting #12982](https://github.com/anthropics/claude-code/issues/12982) - Claude Code should honor the /model setting and should persist across sessions. Error Messages/Logs....

27. [Ultimate guide to extending Claude Code with skills ...](https://gist.github.com/alirezarezvani/a0f6e0a984d4a4adc4842bbe124c5935) - Ultimate guide to extending Claude Code with skills, agents, commands, and utilities. Covers Tresor ...

