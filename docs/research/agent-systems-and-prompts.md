# Agent systems and prompt design research

## Findings

OAL source records stay JSON because they are schema-checked data. Agent prompts are generated from source sections and shared contracts, then rendered into native platform files.

- Codex uses AGENTS.md for project instructions and current evidence points to .codex/agents/*.toml for custom agent config with name, description, developer_instructions, and optional sandbox/model fields. Tool-backed Codex sessions may not expose named custom agents in every surface, so OAL treats generated Codex agent files as native config artifacts rather than universal runtime proof.
- Codex config supports `model_instructions_file`. OAL renders `codex/.codex/model-instructions.md` for global OAL runtime behavior and keeps `codex/AGENTS.md` as project guidance.
- Claude Code subagents are Markdown files with YAML frontmatter under .claude/agents/ or ~/.claude/agents/. Frontmatter carries name, description, tools, and model; Markdown body becomes the role prompt.
- OpenCode supports agents in config and Markdown prompt files. Agent records can define mode, description, prompt file, model, tools, and permissions.

## RPERS workflow

OAL uses Research, Plan, Execute, Review, Ship as the top-level agent workflow:

- Research maps to Hermes evidence work.
- Plan maps to Athena architecture and sequencing.
- Execute maps to Hephaestus implementation.
- Review maps to Nemesis review and Atalanta validation.
- Ship maps to Odysseus coordination and Calliope documentation when needed.

## Positive coding-reliability prompt hardening

The useful greyhat lesson is not exploit wording. It is prompt reframing for coding agents whose assistant training can over-apply apology, reassurance, advice, refusal, or task-shrinking habits to normal engineering work.

OAL uses positive replacement contracts: professional identity, task mode, working-tree stewardship, evidence, validation, source authority, context integrity, and output shape.

Rationale: many models respond better to identity, success criteria, and desired behavior than to negation-heavy lists. The prompt source states what professional coding performance looks like.

## Prompt source model

Each Greek agent has role source. Shared modules are appended by the renderer. Tests prove file wiring, source ownership, deterministic render, schema compatibility, and native output paths. They do not inspect prompt prose with regex, substring lists, required phrases, banned phrases, or length checks.

Shared modules are appended by the renderer:

- operating mode
- working tree
- evidence
- instruction priority
- reporting

The renderer owns native prompt shape. Role files can be ordinary Markdown; Codex agent output gets one top-level agent heading and mechanical demotion for appended role/shared sections.

Rationale: role names and one-line descriptions are not enough for reliable delegation. Specialized agents need explicit scope, evidence rules, output shape, edit-boundary rules, and validation gates, but generated prompts still need to stay readable instead of accumulating repeated top-level headings and label-heavy contract blocks.

## Reddit prompt notes

The local Reddit notes reinforce three patterns:

- Harness-style maps reduce token waste better than giant instruction dumps. The useful shape is modular repo maps, lane routing, skills/agents with focused scope, and maintained source files.
- Stop conditions need execution framing. Agents that ask "if you want, next..." waste turns; OAL prompts make execution mode continue through the accepted task until validation or a named blocker.
- Reasoning/model budgets need routing. Helper/research tasks use cheaper routes; coding and serious review get stronger routes only where they prevent wasted work.

Rationale: these notes are community reports, not authoritative docs, but they match the observed failure modes this repo is fixing: context bloat, unnecessary tool turns, task shrinkage, and weak role prompts.


## Codex config architecture

OAL renders two Codex config layers:

- `codex/.codex/config.toml` for project-scoped behavior. This owns `model_instructions_file`, project doc limits, hook/features switches, agent worker limits, and context/token caps that should travel with the repo.
- `codex/user/config.toml` for `~/.codex/config.toml`-style defaults. This owns active profile, global model/effort, approval behavior, sandbox defaults, memories, history, TUI, skills, tool suggestions, and OAL-prefixed profiles.

Profile names are prefixed with `oal-` to avoid collisions with user-authored Codex profiles: `oal-plus`, `oal-pro-5`, and `oal-pro-20`. Internal subscription ids remain `plus`, `pro-5`, and `pro-20`.

Global effort defaults:

- `model_reasoning_effort = "medium"` for normal edit and implementation mode.
- `plan_mode_reasoning_effort = "high"` for plan mode.

Beneficial config means schema-backed keys that improve quality, delegation, token use, safety, review, UX, or repeatability. OAL excludes secrets, credentials, forced workspace ids, internal endpoints, and machine-specific absolute paths unless those are explicitly sourced.

## Codex subagent TOML

Generated Codex subagents live under `codex/.codex/agents/<id>.toml`. Each file includes name, description, model, model reasoning effort, sandbox mode, and multiline `developer_instructions`.
```toml
developer_instructions = """
...
"""
```
The instruction body uses TOML multiline string syntax because generated prompts are long and line-oriented:
it keeps the prompt readable, avoids escaped newline noise, and preserves Markdown sections as authored.

Models and efforts are taken from source profile defaults. Planning, research, review, and routing agents default to read-only sandboxes. Implementation, validation, and documentation agents use workspace-write when useful.

## Sources

- OpenAI Codex introduction: https://openai.com/index/introducing-codex/
- OpenAI Codex CLI help article: https://help.openai.com/en/articles/11096431-openai-codex-ci-getting-started
- OpenAI Codex AGENTS.md docs in repo: https://github.com/openai/codex/blob/main/docs/agents_md.md
- OpenAI Codex issue documenting current custom-agent TOML fields/runtime gap: https://github.com/openai/codex/issues/15250
- Claude Code subagents: https://docs.claude.com/en/docs/claude-code/sub-agents
- OpenCode agents: https://opencode.ai/docs/agents/
- OpenAI prompt engineering guide: https://help.openai.com/en/articles/6654000-best-practices-for-promptengineering-with-the-openai-api
- Anthropic prompt engineering docs: https://docs.anthropic.com/en/docs/prompt-engineering
- OpenAI prompt injection article: https://openai.com/index/prompt-injections
- Codex advanced config: https://developers.openai.com/codex/config-advanced
- Codex config reference: https://developers.openai.com/codex/config-reference
- Codex best practices: https://developers.openai.com/codex/learn/best-practices
