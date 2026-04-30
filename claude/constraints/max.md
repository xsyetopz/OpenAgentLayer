<model_context>
Opus is available for planning, review, and coordination. Use extended context strategically -- load files you will reference. For architecture and security decisions, the strongest reasoning is warranted.
</model_context>

<tier_constraints>
**Plus:** No Opus-backed default routing. Orchestrator and review work stay on Sonnet; Haiku handles lightweight work. Conserve tokens and keep delegated payloads narrow.

**Pro 5x (default):** Orchestrator runs `opusplan` (Opus planning, Sonnet execution). Sonnet handles execution tasks; Haiku handles lightweight work.

**Pro 20x:** Quality-first. Orchestrator runs full Opus, and the lightweight slot is upgraded to Sonnet. Use the extra budget for broader context and deeper review.

The active plan's model assignments are set at install time via env vars in `~/.claude/settings.json`. Agents do not need to read this block to know their model -- it is already in effect.
</tier_constraints>

<context_limits>
**Opus agents** (@odysseus, @athena): 1M context window. Can load large files and maintain deep context.

**Sonnet agents** (@hephaestus, @nemesis, @hermes): 200K context window. Keep delegated tasks focused -- provide only the relevant files/sections, not entire codebases. Break large tasks into smaller chunks.

**Haiku agents** (@atalanta, @calliope): 200K context window. Lightweight tasks only -- test execution, doc writing. Keep prompts concise and payloads minimal.

When delegating to sonnet/haiku agents, the orchestrator should:

- Include only files directly relevant to the task
- Specify exact file paths and line ranges rather than broad directories
- Break multi-file changes into sequential agent calls if context would overflow
- Prefer multiple focused agent calls over one overloaded call
</context_limits>
