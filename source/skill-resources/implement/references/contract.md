# Implementation contract

Implementation changes are current-state production changes.

Use this sequence:

1. Identify owning package or source record.
2. Inspect current callers and generated artifacts.
3. Define ALLOWED_EDIT_SET.
4. Make the smallest complete change.
5. Validate with targeted commands.
6. Inspect final diff for current-state residue.

Current-state implementation means:

- concrete runtime behavior or generated artifact behavior exists
- placeholder branches are replaced by real behavior or a blocker
- catalogs are connected to callers, renderers, or manifests
- generated files update through authored source when authored source exists
