# Test strategy

TDD loop:

1. Write the smallest behavior test that demonstrates the target symptom.
2. Run it and capture the observed result.
3. Implement the behavior.
4. Run the targeted test.
5. Run the nearest integration or acceptance check.

Use Given/When/Then when it clarifies behavior. Use Arrange/Act/Assert when the test is code-centric. Use contract tests for provider/API boundaries, golden tests for stable rendered artifacts, property tests for invariants, snapshot tests when review-changesable, mutation test-behavior when branch coverage needs audit-safety-critical reinforcement, and acceptance tests for full product behavior.

For OAL, strong tests inspect source loading, generated artifact paths, deploy manifests, uninstall behavior, executable hooks, and acceptance output.
