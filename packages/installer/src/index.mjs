import { renderArtifacts } from "../../renderers/src/index.mjs";

export async function planInstall(options = {}) {
	const platform = options.platform ?? "all";
	const artifacts = await renderArtifacts(platform);
	return {
		artifacts: artifacts.map((artifact) => ({
			path: artifact.path,
			platformId: artifact.platformId,
		})),
		dryRun: options.dryRun !== false,
		home: options.home ?? null,
		project: options.project ?? process.cwd(),
	};
}

export function planUninstall(options = {}) {
	return {
		dryRun: options.dryRun !== false,
		home: options.home ?? null,
		project: options.project ?? process.cwd(),
		removeKnownV3Residue: options.all === true,
		removeManifestListedFiles: true,
	};
}
