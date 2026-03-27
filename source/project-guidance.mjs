export const PROJECT_GUIDANCE = {
  claude: {
    title: "Project Instructions",
    sections: [
      {
        title: "Agents",
        body: `| Task | Agent |
| --- | --- |
| Design, architecture | @athena |
| Code changes, bugs | @hephaestus |
| Security/perf review | @nemesis |
| Run tests | @atalanta |
| Write docs | @calliope |
| Explore codebase | @hermes |
| Multi-step coordination | @odysseus |

Built-in subagents disabled: use @hermes (explore), @athena (plan), @odysseus (general-purpose).`,
      },
      {
        title: "Context",
        body: `- Keep this file under 50 lines. Link to detailed docs instead of inlining.
- Code is truth. Do not restate how code works in docs; link to file:line.
- Use /clear between unrelated tasks. Start fresh at 40-50% context utilization.
- Run git diff --stat before git diff; raw diff can dump too much context.

@RTK.md`,
      },
    ],
  },
  codex: {
    title: "Project Instructions",
    sections: [
      {
        title: "Custom Agents",
        body: `| Task | Agent |
| --- | --- |
| Architecture, planning, sequencing | \`athena\` |
| Code changes and refactors | \`hephaestus\` |
| Review, security, regressions | \`nemesis\` |
| Test execution and failure analysis | \`atalanta\` |
| Documentation | \`calliope\` |
| Codebase exploration | \`hermes\` |
| Multi-step coordination | \`odysseus\` |`,
      },
      {
        title: "Working Rules",
        body: `- Use real AGENTS.md files for Codex guidance. Do not symlink CLAUDE.md.
- Keep Fast mode off for openagentsbtw workflows.
- Keep this file short and task-shaping. Put deep reference material in docs and link to it.
- Ask for athena before large multi-file implementation when the plan is not already clear.
- Run review and validation before closing significant code changes.
- Keep responses terse and peer-like. No praise, apologies, therapy tone, or trailing optional-offer boilerplate.
- Do not leave placeholders or deferred core work unless the user explicitly narrowed scope.
- Internal comments explain non-obvious why only. Do not add narrating or educational comments.`,
      },
    ],
  },
  opencode: {
    title: "openagentsbtw OpenCode Instructions",
    sections: [
      {
        title: "Role Map",
        body: `| Task | Agent |
| --- | --- |
| Architecture, planning, sequencing | \`athena\` |
| Code changes and refactors | \`hephaestus\` |
| Review, security, regressions | \`nemesis\` |
| Test execution and failure analysis | \`atalanta\` |
| Documentation | \`calliope\` |
| Codebase exploration | \`hermes\` |
| Multi-step coordination | \`odysseus\` |`,
      },
      {
        title: "Working Rules",
        body: `- Prefer athena before non-trivial multi-file implementation when the plan is not already clear.
- Keep responses direct, factual, and scoped to the request.
- No praise, apology, therapist tone, or trailing optional-offer boilerplate.
- No placeholders, deferred core work, or fake future-task notes unless the user explicitly narrowed scope.
- Internal comments explain non-obvious why only.
- Read project conventions before acting and prefer repo AGENTS.md plus configured instruction files over generic defaults.
- Run targeted validation before closing significant code changes and route review-heavy work through nemesis.`,
      },
      {
        title: "Guardrails",
        body: `- Never read .env, *.pem, *.key, or credential files unless the user explicitly directs it and the task requires it.
- Never run git commit, git push, or git add unless the user explicitly requests it.
- Never delete files without explicit confirmation.
- Respect the agent permission profile; do not route around it with alternate tools or shell tricks.`,
      },
    ],
  },
};
