# Markdown rules

Use Markdown as structure. Generated prompts, commands, and skills should be readable in raw text and rendered form.
Use CommonMark and GitHub Flavored Markdown for repository docs. GitHub Markdown alerts fit GitHub-rendered notes. The Markdown Guide, Google developer documentation guidance, Microsoft style guide, and Diataxis can shape public docs when the audience and artifact need them.

## Headings

- Use one `#` title, then `##` and `###` in order.
- Keep headings in sentence case when product casing allows it.
- Use short paragraphs. Split long instructions into ordered lists when order matters and bullets when order is flexible.

## Links and code

- Use inline code for commands, filenames, config keys, flags, package names, env vars, and literals.
- Use fenced code blocks with language tags.
- Use links with descriptive text. Bare URLs fit when the URL itself is the subject.

## Emphasis

- Use `**bold**` for labels that structure scanning.
- Use `_italic_` sparingly for first-use terms, words as words, or semantic emphasis that needs markup.
- Link text carries link affordance. Established keywords such as `MUST`, `SHOULD`, and `MAY` fit standards-style text.
- Clear wording beats stacked emphasis markers.

## Directives

Use directives when the target renderer supports them.

- GitHub alerts: `> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]` for docs rendered on GitHub.
- Prompt directives: use headings, bullet contracts, and XML tags to separate instruction, context, examples, and output format.

## Tables

Tables fit compact matrices. Each row should share the same columns. Keep cells short.

## Quotes

Summarize long passages and link the source. Short quotes fit when exact wording matters.

## References

- CommonMark
- GitHub Flavored Markdown
- GitHub Markdown alerts
- Markdown Guide
- Google developer documentation
- Microsoft style guide
- Diataxis
