import type { ContextFile } from "./types.ts";

export function buildContextFiles(): ContextFile[] {
	return [
		{
			filename: "overview.md",
			content: `# Project Overview

Describe the project here so agents understand its purpose and domain.

## Project Features

(replace with a concise description of what the codebase builds or the problem it solves)

## Core Objectives

- (primary objective #1)
- (primary objective #2)

## Target Users

(Who uses this project? Developers? End users? Internal tools?)
`,
		},
		{
			filename: "tech-stack.md",
			content: `# Tech Stack

List the languages, runtimes, frameworks, and tools used in the project.

## Programming Languages

- Primary language: (e.g., TypeScript, Python, Rust, Go, C++)
- Secondary languages: (e.g., shell scripts, SQL)

## Runtime / Package Manager

| Type | Selection |
|---|---|
| Runtime | (e.g., Bun, Node.js, Deno, Python 3.12, Rust 1.x) |
| Package Manager | (e.g., bun, pnpm, pip + .venv, cargo) |

## Build System

- (e.g., cmake + ninja, make, Gradle, cargo, bun build)

## Frameworks / Libraries

- (list key dependencies)

## Testing

| Type | Tool |
|---|---|
| Framework | (e.g., Bun test, pytest, cargo test, Go test) |
| Coverage | (if any) |

## Database / Storage

- (e.g., PostgreSQL, SQLite, Redis)

## Deployment

- (e.g., Docker, AWS Lambda, bare metal)
`,
		},
		{
			filename: "conventions.md",
			content: `# Coding Conventions

Rules that agents must follow when writing or modifying code in this project.

## Formatting Standards

| Item | Standard |
|---|---|
| Indentation style | [tabs / spaces N] |
| Line width limit | [e.g., 100 characters] |
| Final newline | Required |

## Naming Conventions

| Type | Style |
|---|---|
| Variables/Functions | [camelCase / snake_case] |
| Types/Classes | [PascalCase] |
| Constants | [SCREAMING_SNAKE_CASE / camelCase] |
| Files | [kebab-case / snake_case] |

## Import Standards

1. Import order: External -> Internal -> Relative
2. Import style: [prefer named imports / default imports]

## Error Handling

- (describe the project's error handling patterns)
- (e.g., always throw typed errors, never swallow exceptions, Result type)

## Comment Standards

1. Comment the "why", not the "what"
2. Public APIs: (docstring style, if any)
3. TODO format: \`TODO(author): description\`

## Git Standards

| Item | Standard |
|---|---|
| Commit format | Conventional Commits (\`type(scope): description\`) |
| Branch naming | (e.g., feat/name, fix/name) |
| PR size | Keep focused, one PR should solve one problem |
`,
		},
		{
			filename: "structure.md",
			content: `# Repository Structure

Describe key directories and their purposes to help agents navigate correctly.

\`\`\`
project-root/
  src/          Source code
  tests/        Test files (mirrors src/ structure)
  docs/         Documentation
  scripts/      Build, deployment, and utility scripts
  .opencode/    OpenCode agent framework
\`\`\`

## Key Entry Points

| Entry Type | Path |
|---|---|
| Main entry | (e.g., src/index.ts, src/main.rs, cmd/main.go) |
| Tests | (e.g., tests/, src/__tests__/, *_test.go) |
| Configuration | (e.g., config/, .env) |

## Generated Files

Do not modify manually--these are auto-generated:
- (list generated directories/files)

## Third-party / Vendor Code

- (list vendor code that agents should not modify)
`,
		},
		{
			filename: "agent-notes.md",
			content: `# Agent Notes

Critical constraints and guidelines that all agents working on this project must follow.

## Must Do

- Read existing code before modifying
- Follow conventions in conventions.md
- Run tests after making changes
- Use conventional commits when committing

## Must Not Do

- Do not directly modify generated files
- Do not push to remote without explicit user instruction
- Do not delete files without confirmation
- Do not commit secrets or credentials

## Environment Setup

Python project:
\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\\Scripts\\activate  # Windows
pip install -r requirements.txt
\`\`\`

Node.js / Bun project:
\`\`\`bash
bun install  # or npm install / pnpm install
\`\`\`

Rust project:
\`\`\`bash
cargo build
\`\`\`

## Test Commands

(replace with actual test commands for the project)
See also: .opencode/context/tech-stack.md

## Known Issues / Notes

- (any special issues or non-obvious matters agents should know)
`,
		},
	];
}
