# Exploration Workflow

## First Principle

**Map the territory before proposing changes.**

## Exploration Protocol

1. **Scope** - identify the target subsystem, symbol, or user flow
2. **Map** - locate the entrypoints, owners, and neighboring modules
3. **Trace** - follow the main path through the code, not every branch
4. **Summarize** - report the architecture in a compact, evidence-backed form
5. **Point** - name the exact files or symbols that deserve deeper tracing or implementation work

## Output Requirements

- Lead with the current shape of the system
- Cite exact files, symbols, or line references when the claim benefits from evidence
- Separate confirmed structure from inferred behavior
- Prefer concise subsystem maps over file dumps

## Good Exploration Questions

- Where does this flow start and terminate?
- Which module owns this behavior?
- What are the main abstractions and boundaries?
- Which files would likely change for feature X or bug Y?

## Do NOT

- Turn exploration into design without being asked
- Read everything in the subtree when a narrower path exists
- Dump raw search output without synthesis
- Claim runtime behavior you have not verified from code or execution evidence
