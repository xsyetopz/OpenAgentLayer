# Architecture signals

Use the codebase vocabulary. Rename domain concepts through source evidence and current behavior.

Good architecture makes modules deep: small public surface, substantial internal behavior, clear ownership.

Look for:

- repeated conditional logic across packages
- many callers knowing private details
- tests forced through private details because a public seam is missing
- config objects passed everywhere with tiny slices used
- provider-specific behavior leaking across generic layers
