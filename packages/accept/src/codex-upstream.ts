import { readFile } from "node:fs/promises";
import { join } from "node:path";

const CODEX_SUBMODULE = `[submodule "third_party/openai-codex"]
\tpath = third_party/openai-codex
\turl = https://github.com/openai/codex.git
\tbranch = main`;
const CODEX_BASE_INSTRUCTIONS =
	"third_party/openai-codex/codex-rs/protocol/src/prompts/base_instructions/default.md";
const CODEX_PATCH = "patches/openai-codex-base-instructions-default-md.patch";
const CODEX_REDDIT_RESEARCH = "docs/codex-reddit-research.md";

export async function assertCodexUpstreamPatch(
	repoRoot: string,
): Promise<void> {
	const gitmodules = await readFile(join(repoRoot, ".gitmodules"), "utf8");
	if (!gitmodules.includes(CODEX_SUBMODULE))
		throw new Error("OpenAI Codex submodule metadata is missing or incomplete");
	const upstream = await readFile(
		join(repoRoot, CODEX_BASE_INSTRUCTIONS),
		"utf8",
	);
	if (!upstream.includes("## Validating your work"))
		throw new Error("OpenAI Codex upstream base instructions are missing");
	const patch = await readFile(join(repoRoot, CODEX_PATCH), "utf8");
	for (const required of [
		"codex-rs/protocol/src/prompts/base_instructions/default.md",
		"Be respectful but not deferential",
		"do not add emotional validation, people-pleasing agreement, or apology-centered phrasing",
		"Push back on requests, names, designs, or assumptions",
		"Do not paper over symptoms with compatibility shims, aliases, parser fallbacks",
		"Do not add adjacent behavior, hidden fallback paths, defensive layers",
		"Do not widen scope to make a partial solution look complete",
		"Do not run tests, type checks, builds, simulator launches, browser automation, or full validation suites after every implementation step by default.",
		"## OAL and RTK project surfaces",
		"keep AGENTS.md-level context compact",
		"rtk proxy -- <command>",
		"documentation-only work unless the user explicitly asks",
		"implementation request into future-work documentation",
		"add concise end-user copy where the behavior is selected or explained",
		"## Code review and audits",
		"Unknown or potentially large command output must be bounded before it reaches context.",
	])
		if (!patch.includes(required))
			throw new Error(`Codex base-instruction patch missing \`${required}\``);
	const research = await readFile(
		join(repoRoot, CODEX_REDDIT_RESEARCH),
		"utf8",
	);
	for (const required of [
		"Managed hooks need requirements",
		"Base instructions should be patched",
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
