# Review checklist

1. Does the diff implement the requested behavior?
2. Are generated files changed through source or manifest ownership?
3. Are tests behavior-focused and tied to public surfaces?
4. Are provider-specific behaviors native to each provider?
5. Are permissions, secrets, destructive commands, and deploy paths safe?
6. Does validation cover the changed behavior?
7. Does the final diff stay inside ALLOWED_EDIT_SET?

Findings format:

- Severity
- Path and line
- Evidence
- Consequence
- Concrete fix
