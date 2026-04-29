# Harness engineering notes

Purpose: translate harness-engineering ideas into OpenAgentLayer design pressure.

Authority: design notes, not normative spec.

## Interpretation for OAL

Harness engineering means shaping the environment around the model so it can do less guessing and more verified work.

For OpenAgentLayer, that means:

- source graph instead of scattered prompt files;
- route contracts instead of vague task tone;
- runtime guards instead of prose-only warnings;
- scoped docs instead of giant context dumps;
- adapter outputs instead of hand-maintained per-tool drift;
- validation commands that prove the layer still renders and installs.

## Agent-facing consequence

An AI agent using this repo should not need to rediscover architecture from scratch. It should read:

1. spec for authority;
2. plan for next work;
3. doc study for evidence;
4. source files for current truth.

## Design pressure

- Keep canonical records small and composable.
- Load only docs needed by route.
- Let route wrappers inject focused context.
- Keep long studies in `docs/`, not always-on prompt surfaces.
- Track decisions in `plans/decisions.md`.

