# OpenAI / Codex Research

This directory documents the Codex-specific port of openagentsbtw. It was researched against OpenAI’s official Codex docs on 2026-03-27.

## What Lives Here

- `config.md` explains Codex config layers, profile strategy, and the Fast mode decision.
- `model-strategy.md` explains the Plus/Pro preset split, the agent-to-model mapping, and where Codex Mini fits.
- `hooks.md` explains Codex hook events and which Claude hooks do and do not port cleanly.
- `plugins-skills-subagents.md` explains the native Codex extension surfaces that openagentsbtw uses.
- `prompting-and-guardrails.md` captures the GPT/Codex prompting guidance that shapes the new agent prompts.
- `porting-plan.md` is the implementation map from the old Claude-first system to the Codex-native one.

## Canonical Sources

- Config basics: <https://developers.openai.com/codex/config-basic>
- Config advanced: <https://developers.openai.com/codex/config-advanced>
- Config reference: <https://developers.openai.com/codex/config-reference>
- Config sample: <https://developers.openai.com/codex/config-sample>
- Speed and Fast mode: <https://developers.openai.com/codex/speed>
- Rules: <https://developers.openai.com/codex/rules>
- Hooks: <https://developers.openai.com/codex/hooks>
- AGENTS.md guide: <https://developers.openai.com/codex/guides/agents-md>
- Plugins: <https://developers.openai.com/codex/plugins>
- Skills: <https://developers.openai.com/codex/skills>
- Subagents: <https://developers.openai.com/codex/subagents>
- SDK: <https://developers.openai.com/codex/sdk>
- Best practices: <https://developers.openai.com/codex/learn/best-practices>
- Codex prompting guide: <https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide>
- Optimization topic: <https://developers.openai.com/cookbook/topic/optimization>
- Guardrails topic: <https://developers.openai.com/cookbook/topic/guardrails>
- Text topic: <https://developers.openai.com/cookbook/topic/text>
- Agents topic: <https://developers.openai.com/cookbook/topic/agents>

## openagentsbtw Decisions

- Codex is treated as a first-class system, not as a placeholder skill.
- We use native Codex surfaces: plugin manifest, local marketplace entry, custom agents, hooks, and real `AGENTS.md` files.
- We keep Fast mode off in the openagentsbtw Codex profile.
- We do not symlink `CLAUDE.md` for Codex. The project guidance lives in actual `AGENTS.md` files.
