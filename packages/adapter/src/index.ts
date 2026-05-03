import type { ArtifactSet } from "@openagentlayer/artifact";
import type { OalSource, Provider } from "@openagentlayer/source";
import { renderClaude } from "./claude";
import { renderCodex } from "./codex";
import type { RenderOptions } from "./model-routing";
import { renderOpenCode } from "./opencode";

export type { ModelPlan, RenderOptions } from "./model-routing";
export {
	assertKnownModelPlan,
	isClaudePlan,
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
	return {
		artifacts: sets.flatMap((set) => set.artifacts),
		unsupported: sets.flatMap((set) => set.unsupported),
	};
}

export function renderProvider(
	provider: Provider,
	source: OalSource,
	repoRoot: string,
	options: RenderOptions = {},
): Promise<ArtifactSet> {
	if (provider === "codex") return renderCodex(source, repoRoot, options);
	if (provider === "claude") return renderClaude(source, repoRoot, options);
	return renderOpenCode(source, repoRoot, options);
}
