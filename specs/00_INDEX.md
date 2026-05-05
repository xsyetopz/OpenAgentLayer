# OAL Reboot Evidence Pack

This pack studies `xsyetopz/OpenAgentLayer` at commit `bd7fb00663153af0aca90b12b9c525895f1a7a0d`, the pinned deprecated product wording baseline behavior reference, and derives reboot requirements for OAL.

Important naming rule: the reboot must not mention `deprecated product wording`, `deprecated product wording`, or `OAL` in product code or generated user-facing artifacts. Those terms are reference-only for this audit. The new product is OAL / OpenAgentLayer.

## Files

1. `01_baseline behavior_EVIDENCE_AUDIT.md` — what baseline behavior actually did, with evidence.
2. `02_baseline behavior_SUCCEEDED_VS_FAILED.md` — where baseline behavior succeeded and where it fell short.
3. `03_OAL_REBOOT_PRODUCT_SPEC.md` — evidence-derived product definition for OAL.
4. `04_PROVIDER_NATIVE_REQUIREMENTS.md` — Codex, Claude Code, and OpenCode surface requirements.
5. `05_GENERATOR_DEPLOYER_ACCEPTANCE.md` — full-product acceptance gate, not a toy-product gate.
6. `06_NO_STUB_PRODUCT_STANDARD.md` — explicit rejection criteria for cheap/stub artifacts across agents, commands, tools, hooks, configs, deployment, and docs.
7. `PLAN.md` — full reboot plan with checkboxes.

## How to use this pack

Use this as evidence and product-definition input. Do not reduce it to a single long `/goal` prompt. The recurring failure mode is that model workers summarize long instructions into cheap representative artifacts. The correct worker control is an acceptance command that proves end-to-end OAL behavior.
