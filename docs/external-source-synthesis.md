# External source synthesis

Purpose: synthesize existing external-source captures under `docs/reddit/`.

Authority: anecdotal input unless confirmed by specs or implementation evidence.

## Sources

- `docs/reddit/How_are_you_all_actually_using_codex_5.5_.md`
- `docs/reddit/I_find_myself_asking_the_model's_opinion_more_often..md`
- `docs/reddit/OpenAI_doesn't_want_you_to_know_this_trick!.md`
- `docs/reddit/Prompt_engineering_or_personas_in_Codex_skills_or_simply_in_Codex_conversations_.md`
- `docs/reddit/What_about_a__Slow_option_.md`
- `docs/reddit/You_have_to_use_Harness_Engineering_with_GPT_5.5_to_quit_burning_tokens.md`
- `docs/reddit/_If_you_want,_next_I'll..._.md`

## Useful themes

- Agents need concise, consistent, targeted repo context.
- Giant always-loaded docs waste context.
- Users want agents to finish explicit tasks without repeated opt-in prompts.
- Users also need safety gates for destructive actions.
- Personas and skills help when they map to real behavior, not costume prompts.
- Slow/deep modes are useful for planning and review, not every task.
- Harness-style decomposition reduces token burn when docs and tasks are scoped.

## V4 implications

- Keep docs segmented by authority and topic.
- Make route contracts explicit.
- Make command behavior direct.
- Make safety enforcement runtime-backed.
- Add model routing modes for speed/depth.
- Keep external anecdotes out of normative specs unless translated into concrete requirements.

