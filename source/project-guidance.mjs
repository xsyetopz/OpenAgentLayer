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
- Use /clear between unrelated tasks. Start fresh at 90-95% context utilization.
- Run git diff --stat before git diff; raw diff can dump too much context.
`,
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
- Use \`gpt-5.2\` for high-reasoning main work, \`gpt-5.3-codex\` for implementation, and \`gpt-5.3-codex-spark\` for the lightweight mini profile.
- Keep this file short and task-shaping. Put deep reference material in docs and link to it.
- Use athena before large multi-file implementation when the plan is not already clear. Run nemesis review plus targeted validation before closing substantial work.
- Default to role routing: explicitly use the custom agents by name when the task clearly benefits (don’t wait for the user to ask). Keep it proportional; skip spawning for trivial edits.
- Multi-agent safety: when delegating, assign disjoint ownership (paths/modules) so two agents don’t edit the same files. Avoid parallel edits unless the write scopes are clearly separated.
- Default delegation heuristics: hermes for exploration/tracing, athena for planning, hephaestus for edits, nemesis for review, atalanta for tests, calliope for docs.
- Subagents: Codex only spawns subagents when explicitly asked. For non-trivial work, explicitly instruct it to “spawn subagents” by default (unless the user requests single-agent), assign disjoint ownership, wait for all agents, then merge results into one cohesive output.
- Prompt contracts: put critical rules first; specify step order; define ambiguity behavior (ask vs proceed); separate “do the action” from “report the action”; specify output packaging (length, section order, follow-up questions) and include one correct example when output format is strict.
- Reasoning activation: for non-trivial tasks, force structure before the final answer (2–3 options, assumptions, and what evidence would change the conclusion). Prefer permission to be uncertain over pressure to always answer.
- Avoid slop + god objects: prefer small cohesive modules and targeted diffs. If a file grows into a grab-bag, split it before it calcifies.
- Prefer \`oabtw-codex explore\`, \`trace\`, \`debug\`, or \`deepwiki\` before broad repo exploration. Keep \`triage\` as the generic fallback. Use DeepWiki only for public GitHub repos, then verify local file:line claims in the repo.
- Use /clear between unrelated tasks. Start fresh when context usage reaches roughly 90-95%.
- Run \`git diff --stat\` before \`git diff\`. Avoid dumping large files or raw diffs into context.
- Start with the answer, decision, or action. Do not restate the prompt or narrate what you are about to do.
- Match depth to the task. Small asks get short answers. Do not pad with process theater or rapport filler.
- No praise, apology loops, therapist tone, or trailing optional-offer boilerplate.
- If the user's premise is wrong, say so directly and explain why.
- If something is uncertain, say \`UNKNOWN\` and state what would resolve it.
- For code claims, cite the exact path:line when the context benefits from evidence.
- Do not leave placeholders, deferred core work, "for now", or "future PR" notes unless the user explicitly narrowed scope.
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
	copilot: {
		title: "openagentsbtw Copilot Instructions",
		sections: [
			{
				title: "Role Map",
				body: `| Task | Agent |
| --- | --- |
| Research, exploration, tracing | \`hermes\` |
| Architecture, planning, sequencing | \`athena\` |
| Code changes and refactors | \`hephaestus\` |
| Review, security, regressions | \`nemesis\` |
| Test execution and failure analysis | \`atalanta\` |
| Documentation | \`calliope\` |
| Multi-step coordination | \`odysseus\` |`,
			},
			{
				title: "Nano Workflow",
				body: `Research → Plan → Execute → Review → Ship.

Keep the tone neutral. If blocked, stop and ask; do not game tests or weaken requirements.`,
			},
			{
				title: "Working Rules",
				body: `- Keep this file short and task-shaping. Link to detailed docs instead of inlining.
- No urgency, shame, or pressure language. Neutral, factual collaboration.
- Do not hide failures, weaken requirements, or “make tests pass” by cheating.
- Prefer small, direct edits and verify outcomes.
`,
			},
		],
	},
};
