import type { OalSource, Provider } from "@openagentlayer/source";
import type { PolicyIssue } from "./types";

export const CODEX_MODELS = [
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini",
	"gpt-5.3-codex",
] as const;
export const CLAUDE_MODELS = [
	"claude-opus-4-6",
	"claude-opus-4-6[1m]",
	"claude-sonnet-4-6",
	"claude-haiku-4-5",
] as const;
export const FORBIDDEN_CODEX = [
	`${["gpt", "5", "3", "codex"].join("-")}-spark`,
] as const;
export const FORBIDDEN_CLAUDE = [
	["claude", "opus", "4", "7"].join("-"),
	`${["claude", "opus", "4", "7"].join("-")}[1m]`,
	["claude", "opus", "4.7"].join("-"),
	`${["claude", "opus", "4.7"].join("-")}[1m]`,
	["opus", "4", "7"].join("-"),
] as const;

export function validateModels(source: OalSource, issues: PolicyIssue[]): void {
	for (const agent of source.agents) {
		validateProviderModel(
			agent.id,
			"codex",
			agent.models.codex,
			CODEX_MODELS,
			issues,
		);
		validateProviderModel(
			agent.id,
			"claude",
			agent.models.claude,
			CLAUDE_MODELS,
			issues,
		);
	}
}

function validateProviderModel(
	sourceId: string,
	provider: Provider,
	model: string | undefined,
	allowed: readonly string[],
	issues: PolicyIssue[],
): void {
	if (!model || provider === "opencode") return;
	if (!allowed.includes(model))
		issues.push({
			severity: "error",
			code: "model-allowlist",
			message: `\`${provider}\` model \`${model}\` is not allowed`,
			sourceId,
		});
}
