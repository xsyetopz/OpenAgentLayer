# Debug loop

Use this order. Skip a phase only when the task explicitly makes it irrelevant.

1. Build a feedback loop that an agent can run. Prefer tests, CLI fixtures, replay scripts, browser automation, trace replay, fuzz loops, or bisect harnesses. Human clicking is the last resort and must produce captured output.
2. Reproduce the exact user symptom. A nearby failure is not evidence.
3. Write three to five ranked hypotheses. Each one must predict what observation would confirm or falsify it.
4. Instrument the smallest boundary that separates hypotheses. Tag temporary probes with a unique prefix and delete them before completion.
5. Fix after evidence points to one cause. Add the regression at the deepest stable public seam that reproduces the real pattern.
6. Re-run the original loop and the targeted regression.

Block instead of guessing when no loop can be built. Report attempts, evidence captured, and the artifact or access needed.
