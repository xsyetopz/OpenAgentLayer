import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Artifact } from "@openagentlayer/artifact";
import type { Provider } from "@openagentlayer/source";

export async function renderPrivilegedExecArtifacts(
	provider: Provider,
	repoRoot: string,
	prefix: string,
): Promise<Artifact[]> {
	return await Promise.all(
		["privileged-exec.mjs", "privileged-exec-client.mjs"].map(
			async (script) => ({
				provider,
				path: `${prefix}/${script}`,
				content: await readFile(
					join(repoRoot, "packages/runtime/privileged", script),
					"utf8",
				),
				sourceId: `runtime:${script}`,
				executable: true,
				mode: "file" as const,
			}),
		),
	);
}
