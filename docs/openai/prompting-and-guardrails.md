# Prompting And Guardrails

openagentsbtw’s Codex prompts were rewritten around GPT/Codex guidance rather than copied verbatim from the Claude agent markdown. Sources: <https://developers.openai.com/codex/learn/best-practices>, <https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide>, <https://developers.openai.com/cookbook/topic/guardrails>, <https://developers.openai.com/cookbook/topic/optimization>, <https://developers.openai.com/cookbook/topic/agents>

## Prompting Principles We Carried Over

- Put role, scope, and hard rules up front.
- Keep instructions concrete and operational instead of aspirational.
- Tell each agent what not to do, not just what to do.
- Require explicit handling of uncertainty, blockers, and verification.
- Keep prompts short enough that Codex can still focus on the task and local code.

## Codex-Specific Adjustments

- Agent definitions are now TOML with `developer_instructions`, not Claude markdown frontmatter plus prompt bodies.
- Shared prompt content now comes from a structured source model and is rendered per platform instead of treating Claude-shaped prompt text as canonical.
- Multi-agent work is framed around Codex custom agents and the broader multi-agent feature set rather than Claude subagent routing.
- Project shaping guidance moves into `AGENTS.md`, because OpenAI documents that as the main project-instruction channel.
- Hook logic is narrower and more deterministic because Codex’s documented hook events are narrower than the Claude hook graph.
- The `plus`/`pro` model split means the smaller `mini` and `codex-mini` paths need more explicit task framing than `gpt-5.4`.

## Guardrail Strategy

openagentsbtw keeps guardrails at three layers:

1. Agent prompts
   Role-specific boundaries like read-only planning or review-first output.
2. Hooks
   Bash guardrails, redaction, session warnings, and completion checks.
3. Project docs
   `AGENTS.md` keeps the system visible to Codex at the project layer.

The Codex port now also adds a fourth practical layer:

1. Wrapper commands
   `openagentsbtw-codex <mode> ...` routes lightweight flows like docs cleanup, handoff generation, and bounded validation onto the lightweight Codex profile while keeping heavy plan/implement/review work on the main preset.

This is a better fit for Codex than trying to emulate the exact Claude plugin contract.
