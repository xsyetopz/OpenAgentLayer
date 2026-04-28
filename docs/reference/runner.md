# Runner Contract

`oal-runner` owns shell-adjacent policy.

Responsibilities:

- parse command shape
- preserve shell semantics
- detect destructive commands
- choose filter backend
- apply output budgets
- keep token metrics
- use RTK only from capability evidence

It must not force npm or any other package manager without repo evidence.
