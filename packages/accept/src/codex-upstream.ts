import { readFile } from "node:fs/promises";
import { join } from "node:path";

const CODEX_RENDERER = "packages/adapter/src/codex.ts";
const CODEX_SYSTEM_PROMPT = "prompts/codex_base_instruction.custom.md";
const CODEX_REDDIT_RESEARCH = "docs/codex-reddit-research.md";

export async function assertCodexUpstreamPatch(
	repoRoot: string,
): Promise<void> {
	const renderer = await readFile(join(repoRoot, CODEX_RENDERER), "utf8");
	for (const required of ["prompts/codex_base_instruction.custom.md"])
		if (!renderer.includes(required))
			throw new Error(
				`Codex renderer does not reference required prompt surface \`${required}\``,
			);
	if (
		renderer.includes(
			"third_party/openai-codex/codex-rs/protocol/src/prompts/base_instructions/default.md",
		)
	)
		throw new Error(
			"Codex renderer still references third_party upstream base instructions",
		);
	const systemPrompt = await readFile(
		join(repoRoot, CODEX_SYSTEM_PROMPT),
		"utf8",
	);
	for (const required of [
		"# Outcome Contract",
		"# Literal Execution Rule",
		"# Anti-Drift Rule",
		"# Production Default",
		"# Final Response",
		"Final responses must be short, factual, and outcome-first.",
	])
		if (!systemPrompt.includes(required))
			throw new Error(`Codex system prompt missing \`${required}\``);
	const research = await readFile(
		join(repoRoot, CODEX_REDDIT_RESEARCH),
		"utf8",
	);
	for (const required of [
		"Managed hooks need requirements",
		"Base instructions should be replaced by a repo prompt surface",
		"Agents run tests too eagerly",
		"OAL/RTK belongs in base instructions",
		"Reasoning effort has a real quality/cost curve",
		"https://www.reddit.com/r/codex/comments/1t7dqnc/gpt55_low_vs_medium_vs_high_vs_xhigh_the/",
		"Command output can destroy context",
		"Audit false positives waste review time",
		"Deferred or already covered by existing OAL surfaces",
	])
		if (!research.includes(required))
			throw new Error(
				`Codex reddit research disposition missing \`${required}\``,
			);
}
