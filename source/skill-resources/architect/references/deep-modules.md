# Architecture signals

Use the codebase vocabulary. Rename domain concepts through source evidence and current behavior.

Good architecture makes modules deep: small public surface, substantial internal behavior, clear ownership.

Look for:

- repeated conditional logic across packages
- many callers knowing private details
- tests that become clearer through a public seam
- config objects passed everywhere with tiny slices used
- provider-specific behavior leaking across generic layers
