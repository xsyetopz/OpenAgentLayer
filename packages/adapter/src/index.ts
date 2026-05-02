import type { ArtifactSet } from "@openagentlayer/artifact";
import type { OalSource, Provider } from "@openagentlayer/source";
import { renderClaude } from "./claude";
import { renderCodex } from "./codex";
import { renderOpenCode } from "./opencode";

export { renderClaude, renderCodex, renderOpenCode };

export type ProviderAdapter = {
	provider: Provider;
	render(source: OalSource, repoRoot: string): Promise<ArtifactSet>;
};

export async function renderAllProviders(
	source: OalSource,
	repoRoot: string,
): Promise<ArtifactSet> {
	const sets = await Promise.all([
		renderCodex(source, repoRoot),
		renderClaude(source, repoRoot),
		renderOpenCode(source, repoRoot),
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
): Promise<ArtifactSet> {
	if (provider === "codex") return renderCodex(source, repoRoot);
	if (provider === "claude") return renderClaude(source, repoRoot);
	return renderOpenCode(source, repoRoot);
}
