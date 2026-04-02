# openagentsbtw For Codex

Use this skill when the task benefits from the openagentsbtw role split while operating inside Codex.

## Role Map

- `athena`: architecture, planning, sequencing, trade-offs
- `hephaestus`: implementation, bug fixes, refactors, file edits
- `nemesis`: review, security, regressions, risk finding
- `atalanta`: test execution, failure diagnosis, validation
- `calliope`: documentation, changelogs, developer docs
- `hermes`: codebase exploration, tracing, evidence gathering
- `odysseus`: multi-step coordination across several agents

## Codex Mapping

- Keep the immediate blocking task in the main thread when it is faster than delegating.
- Use custom agents by name when the work is clearly specialized.
- Use the built-in `explorer` and `worker` agents only when the custom role split is not important for the task.
- Prefer repo `AGENTS.md` files for project-specific constraints; use this skill for the openagentsbtw operating model.
- Plugin install makes the skills discoverable; `AGENTS.md`, config, hooks, and wrapper commands are what shape default behavior.

## Optional MCP Servers

Some installs also configure optional MCP servers. Do not assume they exist; if they're configured, prefer them where appropriate:

- `chrome-devtools`: Chrome DevTools-backed debugging and performance traces.
- `browsermcp`: controls a real browser tab (requires the Browser MCP extension installed and a connected tab).

## Routing Matrix

Use these wrappers when you want consistent profile selection plus explicit role-shaped prompting:

Short alias: `oabtw-codex`
Canonical equivalent: `openagentsbtw-codex`

- `oabtw-codex triage`
  `hermes`-shaped routing on `openagentsbtw-codex-mini` for bounded search, classification, and evidence gathering.
- `oabtw-codex explore`
  `hermes`-shaped routing on `openagentsbtw-codex-mini` for repo mapping, architecture reading, and evidence-first exploration.
- `oabtw-codex trace`
  `hermes`-shaped routing on `openagentsbtw-codex-mini` for dependency, call-path, and data-flow tracing.
- `oabtw-codex debug`
  `hermes`-shaped routing on `openagentsbtw-codex-mini` for read-only failure investigation and root-cause narrowing.
- `oabtw-codex deepwiki`
  `hermes`-shaped routing on `openagentsbtw-codex-mini` for public GitHub repo exploration through DeepWiki MCP first, with local repo verification before making exact file or line claims.
- `oabtw-codex docs`
  `calliope`-shaped routing on `openagentsbtw-codex-mini` for documentation-only edits.
- `oabtw-codex desloppify`
  `calliope`-shaped routing on `openagentsbtw-codex-mini` for prose cleanup, comment cleanup, and anti-slop passes.
- `oabtw-codex handoff`
  compact handoff writing on `openagentsbtw-codex-mini`.
- `oabtw-codex test`
  `atalanta`-shaped routing on `openagentsbtw-codex-mini` for targeted validation.
- `oabtw-codex plan`
  `athena`-shaped routing on `openagentsbtw`.
- `oabtw-codex accept`
  sandboxed auto-accept implementation routing on `openagentsbtw-accept-edits`.
- `oabtw-codex implement`
  `hephaestus`-shaped routing on `openagentsbtw`.
- `oabtw-codex review`
  `nemesis`-shaped routing on `openagentsbtw`.
- `oabtw-codex orchestrate`
  `odysseus`-shaped routing on `openagentsbtw`.
- `oabtw-codex memory show`
  print the current project's openagentsbtw Codex memory recap and recent session notes.
- `oabtw-codex memory forget-project`
  delete the current project's stored openagentsbtw Codex memory.
- `oabtw-codex memory prune`
  compact the shared openagentsbtw Codex memory store by dropping old session notes.

These wrappers do not hard-bind a native Codex mode like `/plan` to a custom agent. The reliable contract is profile selection plus a strong system prompt, while the custom agent TOMLs hold the actual model pinning for each specialist.

Prefer the specific research routes (`explore`, `trace`, `debug`, `deepwiki`) when the intent is known. Keep `triage` as the generic fallback for bounded search that does not yet fit one of the narrower research patterns.

The `accept` route is an openagentsbtw convenience mode, not a native Codex collaboration mode. It maps to `approval_policy = "never"` plus `sandbox_mode = "workspace-write"` so edits auto-apply inside the sandbox without turning on full access.

## Default Flow

1. Use `athena` before non-trivial multi-file implementation.
2. Use `hephaestus` for the actual code changes.
3. Use `nemesis` after implementation for review and risk scanning.
4. Use `atalanta` for targeted test execution and failure analysis.
5. Use `calliope` for docs only after the implementation is stable.

## Delegation Rules

- Delegate only bounded work with a clear owner.
- Keep read-only exploration in `hermes` or read-only custom agents.
- Keep docs changes in `calliope`, not in implementation agents.
- Use `odysseus` only when the task genuinely needs coordination across several steps or agents.
- Do not duplicate delegated work in the parent thread.

## Output Discipline

- Planning and review agents lead with conclusions and risks.
- Implementation agents report what changed and what was verified.
- Testing agents report exact failures, reproduction steps, and likely root cause.
- Documentation agents keep prose factual and close to the code.
- No praise, apology, therapist tone, or trailing optional-offer boilerplate.
- Do not narrate intent or restate the request. Start with the answer, decision, or action.
- If something is uncertain, say `UNKNOWN` and state what would resolve it.
- No placeholders, "for now", "future PR", or deferred core work unless the user explicitly narrowed scope.
- Internal comments explain non-obvious why only. Do not add narrating or educational comments.
