# Test discipline

Use vertical slices:

1. Pick one observable behavior.
2. Write or run one failing check for that behavior.
3. Implement only enough to pass.
4. Refactor only while green.
5. Repeat.

Use Given/When/Then when it clarifies behavior. Use Arrange/Act/Assert when the test is code-centric. Use contract tests for provider/API boundaries, golden tests for stable rendered artifacts, property tests for invariants, snapshot tests only when reviewable, mutation testing when branch coverage is not enough, and acceptance tests for full product behavior.

Avoid tests coupled to private structure, prompt prose, or incidental formatting unless that text is a parsed provider contract. For OAL, strong tests usually inspect source loading, generated artifact paths, deploy manifests, uninstall behavior, executable hooks, and acceptance output.
