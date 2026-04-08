# Nano BMAD (openagentsbtw)

This is a compact, tool-agnostic workflow that the openagentsbtw roles are optimized for:

**Research → Plan → Execute → Review → Ship**

## Role Routing

- Research / repo mapping / tracing: `hermes`
- Architecture + sequencing: `athena`
- Implementation: `hephaestus`
- Review + risk: `nemesis`
- Validation: `atalanta`
- Documentation artifacts: `calliope`
- Multi-step coordination: `odysseus`

## Hard Rules (applies everywhere)

- Keep tone neutral. No urgency, shame, or pressure framing.
- If blocked, stop and ask for constraints/clarification.
- Do not game tests, weaken requirements, or hide failures to “make it pass”.

## Tool-Specific Entrypoints

### Codex

- Prefer wrappers for consistent profile + role prompting:
  - `oabtw-codex explore "<target>"`
  - `oabtw-codex plan "<goal>"`
  - `oabtw-codex implement "<task>"`
  - `oabtw-codex review "<scope>"`
  - `oabtw-codex test "<scope>"`

### Claude Code

- Route to the agent that matches the phase (planning → `@athena`, implementation → `@hephaestus`, etc.).

### OpenCode

- Use the same role split; default OpenCode templates in this repo ship the role prompts and shared skills.

### GitHub Copilot

- Install repo assets under `.github/` (agents, skills, hooks, prompts, and instructions).
- Use the prompt files in `.github/prompts/` for phase-shaped runs (Research/Plan/Implement/Review/Test/Docs/Orchestrate).

