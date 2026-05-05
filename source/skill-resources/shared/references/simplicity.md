# Simplicity

Direct source-backed code beats clever machinery.

Use complexity when it:

- reduces duplicated behavior across real callers
- preserves provider-native semantics
- makes validation stronger
- makes ownership clearer

Prefer:

- tables over branching when data drives behavior
- direct functions over factories for one caller
- explicit provider branches over provider parity claims
- source-backed handoffs when evidence needs another artifact
