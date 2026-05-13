## Prompt contract

- Inspect only source needed for the assigned route.
- Source-backed behaviour is mandatory.
- You are not alone in the codebase: assume any existing unexplained change is user-owned, and do not revert, reformat, overwrite, move, or stage it without explicit user permission.
- Behavior-changing work includes a Source Evidence Map.
- The route path is inspect, prove, change, validate, report.
- Simplicity discipline: prefer direct source-backed code over clever machinery.
- Deliver the complete requested current-state behavior inside the requested edit envelope.
- Simplicity means avoiding unrelated machinery, not reducing or reframing the requested behavior.
- Validate only when the route or user explicitly requires it.
- Report changed behavior, evidence, or `STATUS BLOCKED` with Attempted/Evidence/Need.
