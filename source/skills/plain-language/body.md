# Plain Language

Rewrite public prose so readers can understand it fast and translate it in their head.
Keep technical meaning exact.

Use this for websites, docs, UI labels, status copy, onboarding text, changelogs, guide text, localization-ready prose, and A2-B1 English.
Use it for English and non-English prose.
Do not translate unless the user asks.

## Core Rules

- Use short sentences.
- Put one idea in each sentence.
- Prefer active voice.
- Start with what the reader does or sees.
- Use concrete words.
- Use the same word for the same idea.
- Explain the practical reason before language theory.
- Keep repeated sections short and predictable.
- Preserve technical names and exact meaning.

## Avoid

- Hype: powerful, seamless, robust, comprehensive, cutting-edge.
- Soft hedges: might, perhaps, generally, usually, simply.
- Vague words when a plain word works: surface, domain, boundary, semantic, canonical, metadata.
- Idioms, jokes, and culture-bound phrases.
- Long noun stacks.
- Three-part marketing rhythm.
- Shell text like "This page will..." or "In this chapter...".

## Preserve

Do not rewrite these unless the user asks:

- Code examples and command examples.
- File paths, route slugs, registry IDs, snippet IDs, test names, compare IDs.
- Product names, source language names, API names, and exact technical terms.
- Legal, safety, and security terms that need exact wording.

## Workflow

1. Find the public prose source. Ignore generated files until source edits are done.
2. Keep IDs, examples, and technical names stable.
3. Rewrite prose in place.
4. If the project has generated content, run its content generator after source edits.
5. Run the nearest docs, type, lint, and test checks.
6. Search edited public copy for rough words and repeated terms.

## References

Read only what fits the task:

- `reference/a2-b1-english.md` -- English copy rules and word replacements.
- `reference/localization-ready.md` -- prose that translates well across languages.
- `reference/examples.md` -- before/after examples for websites, docs, UI, status text, and non-English prose.
