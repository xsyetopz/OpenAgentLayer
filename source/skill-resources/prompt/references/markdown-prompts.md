# Markdown prompts

Use Markdown to make instructions easy to parse and audit. XML tags fit providers that benefit from explicit machine-readable boundaries. OpenAI prompt engineering guidance and Anthropic prompt engineering guidance both support clear task/context separation.

## Layout

Put stable instructions before variable context. Use this order when the provider surface allows it:

1. role and scope
2. source of truth
3. ordered workflow
4. edit envelope
5. validation gate
6. output format
7. variable task/context

## XML tags

Use XML tags for large variable content:

```xml
<instructions>...</instructions>
<task>...</task>
<context>...</context>
<output_format>...</output_format>
```

Keep tag names semantic and consistent. Examples are data; imitate them only when the prompt says so.

## Prompt hygiene

- Use affirmative target states.
- Keep repeated constraints compact.
- Put acceptance gates near output format.
- Use headings and bullets for scanability.
- Prefer clear wording over decorative bolding, emoji markers, hidden comments, and long quote blocks.
- Use **MUST** and **SHOULD** when standards-style strength helps a machine-parsed contract.

## References

- OpenAI prompt engineering
- Anthropic prompt engineering
