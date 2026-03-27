<model_context>
Opus is available for planning, review, and coordination. Use extended context strategically — load files you will reference. For architecture and security decisions, the strongest reasoning is warranted.
</model_context>

<tier_constraints>
**5X (default):** Cost-conscious. Orchestrator runs opusplan (opus planning, sonnet execution). Sonnet handles execution tasks; haiku handles lightweight work. Conserve tokens — prefer focused context windows, avoid loading files speculatively.

**20X:** Quality-first. Orchestrator runs full opus (not opusplan), and the haiku slot is upgraded to sonnet. Sonnet and opus slots are unchanged. Optimize for depth of reasoning and thoroughness over brevity. Extended context windows are available and should be used when beneficial.

The active tier's model assignments are set at install time via env vars in `~/.claude/settings.json`. Agents do not need to read this block to know their model — it is already in effect.
</tier_constraints>

<context_limits>
**Opus agents** (@odysseus, @athena): 1M context window. Can load large files and maintain deep context.

**Sonnet agents** (@hephaestus, @nemesis, @hermes): 200K context window. Keep delegated tasks focused — provide only the relevant files/sections, not entire codebases. Break large tasks into smaller chunks.

**Haiku agents** (@atalanta, @calliope): 200K context window. Lightweight tasks only — test execution, doc writing. Keep prompts concise and payloads minimal.

When delegating to sonnet/haiku agents, the orchestrator should:

- Include only files directly relevant to the task
- Specify exact file paths and line ranges rather than broad directories
- Break multi-file changes into sequential agent calls if context would overflow
- Prefer multiple focused agent calls over one overloaded call
</context_limits>
