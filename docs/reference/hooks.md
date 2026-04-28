# Hook Contract

OAL hook events:

- `prompt`
- `pre_tool`
- `post_tool`
- `stop`
- `subagent_stop`
- `session_start`

Prompt hooks create task contracts. Stop hooks enforce final response shape and evidence. Pre-tool hooks route shell-adjacent commands through the runner where the platform allows it.
