# Architecture review

Use the codebase vocabulary. Do not rename domain concepts casually.

**Look for these signals:**

- a module whose interface is as complex as its implementation
- many callers repeating the same product rule
- a package split that exists only to look layered
- one file changing for unrelated reasons
- tests forced through private details because no public seam exists
- provider-specific behavior hidden behind generic names

Apply the deletion test. If deleting the module makes complexity vanish, it was probably pass-through. If deleting it scatters the rule across callers, the module is earning its place.

**Present candidates as:** problem, involved modules, simpler shape, validation impact, and what evidence would disprove the proposal.
