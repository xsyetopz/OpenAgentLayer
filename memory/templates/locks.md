# File Locks

Prevents edit conflicts when multiple agents work simultaneously.

**Last Updated:** {TIMESTAMP}

## Active Locks

| File | Owner | Since | Task | Expires |
|------|-------|-------|------|---------|
| {file_path} | {agent_name} | {timestamp} | {task_id} | {expiry_time} |

## Lock Rules

1. **Acquire before editing**: Add entry to this file before modifying source files
2. **Release after completing**: Remove entry when done with the file
3. **Respect others' locks**: Do not edit files locked by other agents
4. **Expiry**: Locks expire after 1 hour if not explicitly released
5. **Conflict resolution**: If you need a locked file, message the owner in tasks.md

## Example Lock Cycle

### Acquiring a Lock
```markdown
| src/feature/types.rs | implementer | 2024-01-15T10:30:00Z | T3 | 2024-01-15T11:30:00Z |
```

### Releasing a Lock
Simply remove the row from the table above.

## Stale Lock Cleanup

If a lock has expired (>1 hour old) and the owning agent is not active:
1. Check tasks.md for agent's last message
2. If no activity, remove the stale lock
3. Post in tasks.md: `[TIMESTAMP] {your_agent}: Cleared stale lock on {file} (was held by {owner})`

## Lock Granularity

- Lock specific files, not directories
- For multiple related files, lock them all in one operation
- Prefer smaller lock scopes when possible

---

## Current Locks

(Add your locks below this line)

| File | Owner | Since | Task | Expires |
|------|-------|-------|------|---------|
