# Caveman Compress

Compress a prose-first file into Caveman style using the local script shipped with this skill.

## Allowed Targets

- Markdown: `.md`, `.mdx`
- Plain text: `.txt`
- Extensionless text files

Never compress:

- code files
- config files
- lockfiles
- binaries
- any `*.original.md` backup

## Run

Resolve the target to an absolute path, then run the local script adjacent to this skill:

```bash
node scripts/compress.mjs /absolute/path/to/file
```

## Requirements

- Write a human-readable backup as `<file>.original.md` before overwriting.
- Preserve fenced code blocks, inline code, URLs, paths, headings, lists, and tables.
- Refuse unsupported file types instead of guessing.
- Report exactly what changed and where the backup was written.
