# Dedupe Checklist

1. Scan owning package and direct dependents for repeats.
2. Group exact vs near-duplicate findings.
3. Choose canonical owner module per group.
4. Introduce shared constant/type/helper names with domain meaning.
5. Migrate all consumers in one pass.
6. Remove obsolete local copies and aliases.
7. Run targeted lint/tests and record proof.
