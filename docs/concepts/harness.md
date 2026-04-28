# Harness Boundary

OAL is not an agent runtime. It is the layer around coding-agent tools.

OAL owns:

- source specs
- native adapter rendering
- install manifests
- command runner policy
- hook contracts
- validation gates

Existing tools own:

- model execution
- editor or terminal UI
- native config precedence
- native skills, agents, commands, and hooks
- external integrations such as RTK, Context7, and Caveman

The rule: use the native surface when it exists; mark it unsupported when it does not.
