# v3 lessons

Purpose: distill v3 evidence into v4 design lessons.

Authority: research synthesis only.

Evidence base: `v3_to_be_removed/` source, generator, hook, installer, and generated surface files.

## Worked well

- One canonical source feeding multiple surfaces.
- Strong role separation: planner, implementer, reviewer, validator, documenter, explorer, coordinator.
- Runtime hooks that enforced behavior instead of relying only on prompt text.
- Route contracts that described work shape.
- Generated artifact tests.
- Self-contained installed hook helpers.
- Wrapper commands that made route invocation explicit.

## Did not scale

- Generator responsibilities concentrated too much behavior in `scripts/generate.mjs`.
- Commands were platform-split before semantic normalization.
- Hook behavior was spread across policy JSON, runtime scripts, generated maps, and generated plugins.
- Install logic mixed platform concerns in large scripts.
- Documentation was not structured as an AI-agent-readable corpus.

## V4 translation

- Source graph stays.
- Surface-native output stays.
- Runtime guard concept stays.
- Package boundaries change.
- Source formats change to TOML plus Markdown.
- Command and skill format becomes unified.
- Validation becomes a first-order subsystem.
