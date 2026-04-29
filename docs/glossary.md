# Glossary

Purpose: shared terminology for OpenAgentLayer v4.

## Terms

OpenAgentLayer:
: Portable agent behavior layer.

OAL:
: Short name for OpenAgentLayer.

Layer:
: Product category. A layer adds behavior to existing agentic tools without owning their execution loop.

Surface:
: Target agentic tool or IDE that receives rendered artifacts.

Adapter:
: Renderer and installer bridge for a surface.

Source graph:
: Normalized canonical graph of agents, skills, commands, policies, guidance, models, and surfaces.

Agent:
: Role-specific behavior package.

Skill:
: Reusable procedural capability package.

Command:
: User-facing route into role, prompt, and contract behavior.

Policy:
: Declared behavior rule.

Runtime guard:
: Executable enforcement of policy.

Route contract:
: Work-shape requirement such as readonly, edit-required, or execution-required.

Managed file:
: File written by installer and tracked in manifest.

Render drift:
: Difference between source graph and generated output.

Install drift:
: Difference between expected managed files and installed state.

