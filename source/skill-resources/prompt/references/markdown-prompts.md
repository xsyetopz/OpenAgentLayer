# Markdown prompt structure

Use Markdown to make instructions easier to parse and audit. Use XML tags only when the provider benefits from explicit machine-readable boundaries.

## Prompt sections

Put stable instructions before variable context. Use this order unless the provider-specific surface requires another shape:

1. `# Role` or owner, when role affects behavior.
2. `## Objective` with the single outcome.
3. `## Inputs` or `<context>` for user data and source snippets.
4. `## Rules` with **MUST**, **MUST NOT**, and **SHOULD** statements.
5. `## Workflow` as ordered steps.
6. `## Output format` with a compact correct example when format matters.
7. `## Failure behavior` with blocker fields.
8. `## References` for external standards or provider docs.

## Directive syntax

- Use Markdown headings and lists for human-readable hierarchy.
- Use XML tags such as `<instructions>`, `<context>`, `<examples>`, and `<output_format>` when the prompt has multiple blocks that the model might confuse.
- Keep tag names semantic and consistent. Do not invent clever names.
- Treat examples as data unless the prompt explicitly says to imitate them.
- Separate instructions from quoted source, logs, code, or user-provided text.

## Emphasis in prompts

- Use `**MUST**` and `**MUST NOT**` for hard constraints.
- Use `**SHOULD**` for strong defaults that can be overridden by source evidence.
- Use `**Evidence required:**` and similar run-in labels to make audits scannable.
- Use inline code for literal commands, paths, model IDs, provider keys, route IDs, and exact output tokens.
- Avoid decorative bolding, emoji markers, hidden comments, and long quote blocks.

## References

- [OpenAI prompt engineering guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [OpenAI prompt engineering best practices](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api)
- [OpenAI instruction guidelines for custom GPTs](https://help.openai.com/en/articles/9358033)
- [Anthropic prompt engineering overview](https://docs.anthropic.com/en/docs/prompt-engineering)
- [Anthropic XML tag prompting guidance](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
