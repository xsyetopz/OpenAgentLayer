<model_context>
Opus is available for planning, review, and coordination. Use extended context strategically — load files you will reference. For architecture and security decisions, the strongest reasoning is warranted.
</model_context>

<tier_constraints>
**5X (default):** Cost-conscious. Orchestrator runs opusplan (opus planning, sonnet execution). Sonnet handles execution tasks; haiku handles lightweight work. Conserve tokens — prefer focused context windows, avoid loading files speculatively.

**20X:** Quality-first. All roles run opus-class models — orchestrator, subagents, and default sonnet/haiku slots all route to opus. Token conservation is not a constraint. Optimize for depth of reasoning and thoroughness over brevity. Extended context windows are available and should be used when beneficial.

The active tier's model assignments are set at install time via env vars in `~/.claude/settings.json`. Agents do not need to read this block to know their model — it is already in effect.
</tier_constraints>
