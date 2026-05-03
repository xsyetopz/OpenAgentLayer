import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { renderAllProviders, renderProvider } from "@openagentlayer/adapter";
import { writeArtifacts } from "@openagentlayer/artifact";
import { option, providerOptions } from "../arguments";
import { renderOptions } from "../model-options";
import { scopeArtifacts, scopeContext } from "../scope";
import { loadCheckedSource } from "../source";

export async function runRenderCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const out = option(args, "--out") ?? resolve(repoRoot, "generated");
	const providers = providerOptions(option(args, "--provider") ?? "all");
	const options = await renderOptions(args);
	const context = scopeContext(args);
	const source = await loadCheckedSource(repoRoot);
	await mkdir(out, { recursive: true });
	const rendered = (
		await Promise.all(
			providers.map((provider) =>
				provider === "all"
					? renderAllProviders(source, repoRoot, options)
					: renderProvider(provider, source, repoRoot, options),
			),
		)
	).flatMap((set) => set.artifacts);
	const artifacts = scopeArtifacts(context, rendered);
	if (artifacts.length === 0)
		throw new Error(
			`No artifacts rendered for provider ${providers.join(",")}.`,
		);
	await writeArtifacts(out, artifacts);
	console.log(
		`Generated OpenAgentLayer ${providers.join(",")} artifacts at ${out}`,
	);
}
