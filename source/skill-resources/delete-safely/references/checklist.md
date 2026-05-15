# Delete checklist

Before removing paths, capture:

1. User intent: exact requested path or artifact class.
2. Ownership: git status, generated marker, manifest ownership entry, package owner, or source record.
3. Scope: target root and glob expansion preview.
4. Recovery: current branch, dirty files, and whether the file is generated.
5. Execution: bounded delete command or patch deletion.
6. Validation: status and targeted check.

Safe delete evidence:

- path under target root
- ownership proven by manifest, marker, generated output, or explicit user request
- dirty user edits preserved or explicitly requested for removal
- generated artifacts removed through source/deploy ownership when available

Blocker signals:

- dirty user work lacks explicit removal intent
- generated artifact target lacks manifest or marker evidence
- glob expands outside the named target root
- path ownership is ambiguous
