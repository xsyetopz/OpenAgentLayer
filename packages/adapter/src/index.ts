import type { ArtifactSet } from "@openagentlayer/artifact";
import type { OalSource, Provider } from "@openagentlayer/source";
import { renderClaude } from "./claude";
import { renderCodex } from "./codex";
import type { RenderOptions } from "./model-routing";
import { renderOpenCode } from "./opencode";

export type {
	CodexModel,
	CodexOrchestrationMode,
	CodexOrchestrationOptions,
	ModelPlan,
	RenderOptions,
} from "./model-routing";
export {
	assertKnownModelPlan,
	isClaudePlan,
	isCodexProfileModel,
	isCodexPlan,
	isOpenCodePlan,
	parseOpenCodeModels,
} from "./model-routing";
export { renderClaude, renderCodex, renderOpenCode };

export type ProviderAdapter = {
	provider: Provider;
	render(
		source: OalSource,
		repoRoot: string,
		options?: RenderOptions,
	): Promise<ArtifactSet>;
};

export async function renderAllProviders(
	source: OalSource,
	repoRoot: string,
	options: RenderOptions = {},
): Promise<ArtifactSet> {
	const sets = await Promise.all([
		renderCodex(source, repoRoot, options),
		renderClaude(source, repoRoot, options),
		renderOpenCode(source, repoRoot, options),
	]);
	const artifacts = sets.flatMap((set) => set.artifacts);
	return {
		artifacts,
		unsupported: sets.flatMap((set) => set.unsupported),
	};
}

export async function renderProvider(
	provider: Provider,
	source: OalSource,
	repoRoot: string,
	options: RenderOptions = {},
): Promise<ArtifactSet> {
	const set =
		provider === "codex"
			? await renderCodex(source, repoRoot, options)
			: provider === "claude"
				? await renderClaude(source, repoRoot, options)
				: await renderOpenCode(source, repoRoot, options);
	return set;
}
