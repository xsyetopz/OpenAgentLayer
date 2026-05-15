# Cross-platform app workflow

1. Identify the product goal, target platforms, required integrations, and validation gate.
2. Inspect existing app structure, package manager files, generated files, and platform folders.
3. If greenfield, scaffold the rigid stack from `stack.md` and `design-architecture.md`.
4. Implement one vertical slice at a time: route, state, UI, data contract, error/empty states, tests.
5. Keep platform capabilities explicit: permissions, entitlements, background modes, signing, deep links, and web constraints.
6. Run the narrowest useful validation for changed code and report the exact command and outcome.
7. Return `STATUS BLOCKED` with Attempted, Evidence, and Need when an SDK, device, signing profile, API credential, or platform account is required.

Do not add alternate design-architecture choices, optional framework comparisons, or placeholder demos unless the user asks for map-repository.
