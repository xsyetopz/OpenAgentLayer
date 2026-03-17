<model_context>
Opus is available for planning, review, and coordination. Use extended context strategically — load files you will reference. For architecture and security decisions, the strongest reasoning is warranted.
</model_context>

<tier_constraints>
### Context Budget

- 300k token context budget. Reserve 200k for critical reasoning tasks.
- At 40-50% context utilization, recommend a fresh session if reasoning quality matters.
- Prefer KISS over SOLID. Functions under 30 lines. Abstractions earn their place through reuse.

### Escalation

- Present 2-3 options with tradeoffs for medium/high stakes decisions.
- Sensitive data: replace PII with [REDACTED] in all outputs.
</tier_constraints>
