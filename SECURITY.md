# Security Policy

## Reporting Vulnerabilities

Report security issues to the maintainers via GitHub Security Advisories (preferred) or email. Do not open public issues for security vulnerabilities.

## Security Model

ClaudeAgents hooks are **guardrails, not walls**. They catch common mistakes and enforce best practices, but are not a security boundary against determined adversaries.

### What hooks protect against

- Accidental secret leaks in command output (post-bash.mjs)
- Blanket `git add .` that may stage .env files (pre-bash.mjs)
- Broad `rm -rf` on system paths (pre-bash.mjs)
- Placeholder/stub code reaching production (post-write.mjs, subagent-scan.mjs)
- Silent scope reduction by agents (subagent-scan.mjs)
- DNS exfiltration patterns (pre-bash.mjs)

### What hooks do NOT protect against

- Sophisticated prompt injection attacks
- Adversarial code in untrusted repositories
- Supply chain attacks via dependencies

### Defense in depth

For production use, combine hooks with:

1. **OS-level sandboxing**: macOS Seatbelt, Linux bubblewrap, or Docker containers
2. **Permission deny rules**: the settings template blocks access to ~/.ssh, ~/.aws, credentials
3. **Code review**: @nemesis should review changes before committing via /cca:ship
4. **Minimal permissions**: only grant tools each agent needs (enforced via agent frontmatter)

## Sandboxing Recommendations

### macOS (Seatbelt)

Use Claude Code's built-in `/sandbox` command, or run with a custom Seatbelt profile that restricts filesystem and network access to the project directory.

### Linux (bubblewrap)

```bash
bwrap --ro-bind / / --dev /dev --proc /proc --tmpfs /tmp \
  --bind "$PROJECT_DIR" "$PROJECT_DIR" \
  --unshare-net \
  claude
```

### Docker / Devcontainers

Mount only the project directory. Do not mount ~/.ssh, ~/.aws, or other credential stores.

## Known CVE Mitigations

- **CVE-2025-59536** (RCE via malicious project config): Fixed in Claude Code v1.0.111. Always update to the latest Claude Code version.
- **CVE-2026-21852** (API key exfiltration): Fixed in Claude Code v2.0.65. The pre-secrets hook provides an additional layer of protection.

## Skill/Plugin Vetting

Before installing third-party skills or plugins:

1. Read the SKILL.md or plugin source code
2. Check for hidden instructions or obfuscated commands
3. Verify the author's reputation and repository history
4. Prefer plugins from verified marketplaces with audit trails
