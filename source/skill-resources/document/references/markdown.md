# Markdown structure and emphasis standard

Use Markdown as structure, not decoration. A generated prompt, command, or skill should be readable in raw text and rendered form.

## Structure

- Use one `#` title, then `##` and `###` in order. Do not skip heading levels for visual size.
- Keep headings in sentence case unless the product name requires casing.
- Use short paragraphs. Split long instructions into ordered lists when order matters and bullets when order does not matter.
- Use tables for compact matrices only when every row shares the same columns.
- Use fenced code blocks with language identifiers for code, shell, JSON, TOML, YAML, Markdown, diffs, and logs.
- Use `diff` fences for before/after examples when the changed lines are the point.
- Use inline code for commands, file paths, config keys, model IDs, environment variables, route IDs, and literal user input.
- Use links with descriptive text. Avoid bare URLs unless the URL itself is the subject.

## Emphasis language

- Use `**bold**` for **required** terms, UI labels, run-in labels, and the most important warning phrase in a notice.
- Use `_italic_` sparingly for first-use terms, words as words, or semantic emphasis that cannot be carried by sentence wording.
- Do not use underlines. Readers expect underlined text to be a link.
- Do not use all caps for emphasis except established keywords such as `MUST`, `SHOULD`, and `MAY` in standards-style text.
- Do not stack emphasis markers unless the renderer and audience need it. Prefer clear wording over `***bold italic***`.

## Directives and admonitions

Use directives only when the target renderer supports them.

- GitHub-style alerts: use `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, or `> [!CAUTION]` only in GitHub-rendered Markdown.
- Portable fallback: use `**Note:**`, `**Warning:**`, or a `##` heading when the renderer is unknown.
- Prompt directives: use headings, bullet contracts, and XML tags only to separate instruction, context, examples, and output format. Do not hide instructions in comments or decorative blocks.
- HTML comments are allowed only for generated-file ownership markers or renderer-specific metadata.

## Attribution and references

- Attribute external standards and guides by name and link.
- Prefer a `## References` section when a skill or command relies on external standards.
- Do not quote long passages. Summarize rules and link the source.
- Keep source-specific claims close to the link that supports them.

## References

- [CommonMark emphasis and strong emphasis](https://spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis)
- [GitHub Flavored Markdown specification](https://github.github.com/gfm/)
- [GitHub Markdown alerts](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/basic-writing-and-formatting-syntax#alerts)
- [Markdown Guide basic syntax](https://www.markdownguide.org/basic-syntax/)
- [Google developer documentation text-formatting summary](https://developers.google.com/style/text-formatting)
- [Google developer documentation Markdown guidance](https://developers.google.com/style/markdown)
- [Microsoft style guide: headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)
- [Diataxis documentation framework](https://diataxis.fr/)
