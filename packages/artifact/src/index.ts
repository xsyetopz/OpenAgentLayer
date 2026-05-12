import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Provider } from "@openagentlayer/source";

export interface Artifact {
	provider: Provider;
	path: string;
	content: string;
	sourceId: string;
	executable?: boolean;
	mode: "file" | "block" | "config";
}
export interface ArtifactSet {
	artifacts: Artifact[];
	unsupported: { provider: Provider; capability: string; reason: string }[];
}
export function artifactHash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}
export function withProvenance(artifact: Artifact): Artifact {
	const provenance = renderProvenance(artifact);
	if (!provenance) return { ...artifact, content: `${artifact.content}` };
	if (artifact.content.startsWith("#:schema ")) {
		const [schema, ...rest] = artifact.content.split("\n");
		return {
			...artifact,
			content: `${schema}\n${provenance}\n${rest.join("\n")}`,
		};
	}
	return {
		...artifact,
		content: `${provenance}\n${artifact.content}`,
	};
}

export function managedBlockMarker(
	artifact: Pick<Artifact, "provider">,
): string {
	return `oal ${artifact.provider}`;
}

function renderProvenance(artifact: Artifact): string {
	if (artifact.path.endsWith(".md"))
		return [
			`<!-- >>> ${managedBlockMarker(artifact)} >>> -->`,
			`<!-- Source: ${artifact.sourceId} -->`,
			"<!-- Regenerate: oal render -->",
			`<!-- <<< ${managedBlockMarker(artifact)} <<< -->`,
			"",
		].join("\n");
	if (artifact.path.endsWith(".mjs") || artifact.path.endsWith(".ts"))
		return "";
	if (artifact.path.endsWith(".jsonc"))
		return [
			`// >>> ${managedBlockMarker(artifact)} >>>`,
			`// Source: ${artifact.sourceId}`,
			"// Regenerate: oal render",
			`// <<< ${managedBlockMarker(artifact)} <<<`,
		].join("\n");
	if (artifact.path.endsWith(".toml"))
		return [
			`# >>> ${managedBlockMarker(artifact)} >>>`,
			`# Source: ${artifact.sourceId}`,
			"# Regenerate: oal render",
			`# <<< ${managedBlockMarker(artifact)} <<<`,
		].join("\n");
	return "";
}
export async function writeArtifacts(
	root: string,
	artifacts: Artifact[],
): Promise<void> {
	for (const artifact of artifacts) {
		const target = join(root, artifact.path);
		await mkdir(dirname(target), { recursive: true });
		await writeFile(
			target,
			artifact.content,
			artifact.executable ? { mode: 0o755 } : undefined,
		);
	}
}
export async function compareArtifacts(
	root: string,
	artifacts: Artifact[],
): Promise<string[]> {
	const drifted: string[] = [];
	for (const artifact of artifacts) {
		const target = join(root, artifact.path);
		try {
			const installed = await readFile(target, "utf8");
			if (artifactHash(installed) !== artifactHash(artifact.content))
				drifted.push(artifact.path);
		} catch {
			drifted.push(artifact.path);
		}
	}
	return drifted;
}
export function combineArtifactSets(sets: ArtifactSet[]): ArtifactSet {
	return {
		artifacts: sets.flatMap((set) => set.artifacts),
		unsupported: sets.flatMap((set) => set.unsupported),
	};
}
