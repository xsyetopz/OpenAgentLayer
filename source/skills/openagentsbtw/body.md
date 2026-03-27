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

## Routing Matrix

Use these wrappers when you want consistent profile and role routing:

- `openagentsbtw-codex triage`
  `hermes`-leaning routing on `openagentsbtw-codex-mini` for bounded search, classification, and evidence gathering.
- `openagentsbtw-codex docs`
  `calliope`-leaning routing on `openagentsbtw-codex-mini` for documentation-only edits.
- `openagentsbtw-codex desloppify`
  `calliope`-leaning routing on `openagentsbtw-codex-mini` for prose cleanup, comment cleanup, and anti-slop passes.
- `openagentsbtw-codex handoff`
  compact handoff writing on `openagentsbtw-codex-mini`.
- `openagentsbtw-codex test`
  `atalanta`-leaning routing on `openagentsbtw-codex-mini` for targeted validation.
- `openagentsbtw-codex plan`
  `athena`-leaning routing on `openagentsbtw`.
- `openagentsbtw-codex implement`
  `hephaestus`-leaning routing on `openagentsbtw`.
- `openagentsbtw-codex review`
  `nemesis`-leaning routing on `openagentsbtw`.
- `openagentsbtw-codex orchestrate`
  `odysseus`-leaning routing on `openagentsbtw`.

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
- No praise, apology, therapist tone, or trailing "if you want..." boilerplate.
- No placeholders, "for now", "future PR", or deferred core work unless the user explicitly narrowed scope.
- Internal comments explain non-obvious why only. Do not add narrating or educational comments.
