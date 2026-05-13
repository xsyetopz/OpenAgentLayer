# Codex reddit research disposition

This document records the Reddit findings that shaped the Codex release changes.
The local `docs/reddit/r-codex/*.md` export is intentionally not required at
runtime; durable references live here as external links.

## Applied in this release

- **Managed hooks need requirements:** Codex hooks should be enabled through
  `requirements.toml` with canonical `hooks = true`, not deprecated
  `codex_hooks`. OAL now renders `.codex/requirements.toml` and acceptance
  checks reject `codex_hooks`.
- **Base instructions should be patched, not replaced by local baseline text:**
OAL now reads upstream `openai/codex` base instructions from
`third_party/openai-codex/codex-rs/protocol/src/prompts/base_instructions/default.md`
and applies `patches/openai-codex-base-instructions-default-md.patch`.
- **Agents run tests too eagerly:** the Codex base patch tells agents not to run
  tests, type checks, builds, browser automation, simulator launches, or full
  validation suites after every implementation step by default.
- **Validation should be targeted:** the Codex base patch keeps targeted checks
  as the first validation tier and broadens only when the task requires broader
  confidence.
- **OAL/RTK belongs in base instructions, not AGENTS bloat:** detailed
  OAL-specific CLI and `rtk-ai/rtk` behavior now lives in the patched Codex base
  instructions. Generated `AGENTS.md` stays compact and points to source,
  provider-native behavior, context budget, and route ownership.
- **Command output can destroy context:** the Codex base patch requires unknown
  or potentially large command output to be byte bounded before it reaches
  context.
- **Audit false positives waste review time:** the Codex base patch adds review
  guidance requiring conclusive, actionable findings and allowing a no-findings
  result.
- **Reasoning effort has a real quality/cost curve:** heavy GPT-5.5 reasoning
  can burn weekly quota quickly, so OAL does not use lower GPT-5.5 effort as
  the primary cost control for constant goal loops. Generated Codex agents use
  `gpt-5.5` for intelligence-heavy orchestration, planning, review, and
  observation roles; significant code-writing work routes to rendered
  GPT-5.3-Codex implementation workers; utility/light subagent profiles keep
  `gpt-5.4-mini`.
- **Local weekly usage evidence:** the local Codex state database showed the
  fastest weekly drain came from `gpt-5.5` medium sessions, including 45
  threads and about 2.66B tokens in week `2026-18`, plus 12 threads and about
  2.06B tokens in week `2026-17`. OAL therefore avoids escalating 5.5 effort
  further by default.
- **Root-session drain beats native subagent drain:** the largest local
  rollouts were blank/root Codex sessions with thousands of shell calls and
  many compactions. Native `thread_source = subagent` usage was tiny by
  comparison. OAL therefore adds `oal codex-usage` and a generated parent
  quota guard that moves broad root work into handoff, peer batch,
  OpenDex/Symphony, or a fresh bounded session before the parent thread runs
  away. With Codex goals enabled, that handoff is session-complete only and
  must not be reported as COMPLETE-complete product completion unless the
  original objective is actually done.

## External research links

- [GPT-5.5 vs GPT-5.4 vs Opus 4.7 on 56 real coding tasks](https://www.reddit.com/r/codex/comments/1t0xt5m/gpt55_vs_gpt54_vs_opus_47_on_56_real_coding_tasks/)
- [GPT-5.5 low vs medium vs high vs xhigh reasoning curve](https://www.reddit.com/r/codex/comments/1t7dqnc/gpt55_low_vs_medium_vs_high_vs_xhigh_the/)
- [GPT-5.5 xhigh strongest measured coding agent](https://www.reddit.com/r/codex/comments/1t5ipjd/gpt55_xhigh_is_the_strongest_coding_agent_weve/)
- [Codex may only read the first ~220 lines of a skill file](https://www.reddit.com/r/codex/comments/1t1rbqt/codex_may_only_read_the_first_220_lines_of_a/)
- [AGENTS.md trick that stopped dumb work at premium rates](https://www.reddit.com/r/codex/comments/1t3ffxe/agentsmd_trick_that_stopped_codex_from_doing_dumb/)
- [PSA: Codex/GPT-5.5 may manufacture audit bugs](https://www.reddit.com/r/codex/comments/1t4kbn1/psa_during_code_audits_codexgpt55_will/)
- [GPT-5.5 strong but weak for UI/UX](https://www.reddit.com/r/codex/comments/1t9zow6/credit_where_credit_is_due_gpt55_is_an_absolute/)

## Deferred or already covered by existing OAL surfaces

- **Skill progressive disclosure:** OAL already ships skill entrypoints and
  support files separately; no new release change was required beyond keeping
  critical behavior in invoked skill bodies and provider artifacts.
- **Task identity and session discipline:** generated agent prompts are reduced
  to role, routes, skills, tools, edit-envelope discipline, and final evidence
  expectations instead of repeating the full global contract in every agent.
- **Model routing by task complexity:** existing OAL model plan work owns this
  axis. This release does not add compatibility aliases or alternate legacy
  routing names.
- **UI/UX visual workflow:** existing OAL design and image-generation skills
  cover visual iteration workflows. No Codex base-instruction change was needed
  for this hooks/base-instruction release.
- **Benchmark and release evaluation:** this release strengthens acceptance
  coverage for the new Codex artifacts, but release validation still has to be
  run explicitly before publication.
