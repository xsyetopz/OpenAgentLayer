# macOS Install

macOS is a primary target.

Expected flow:

```bash
oal doctor
oal install codex
oal install opencode
```

Install must write a manifest with managed file hashes. Uninstall must remove only manifest-owned files.
