# Debug loop

Use this order. A phase can be complete by task evidence or explicit irrelevance.

1. Capture the exact user symptom and environment.
2. Reproduce the exact user symptom. Nearby observations become separate evidence.
3. Reduce the reproduction to the smallest command or fixture.
4. Rank causes by falsifiability.
5. Instrument one variable at a time.
6. Fix the root cause.
7. Re-run the original reproduction and a targeted regression check.
8. Remove temporary probes.

When the loop needs another artifact, return STATUS BLOCKED with attempts, evidence captured, and the artifact or access needed.
