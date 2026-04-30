export async function verifyRenderedHooks(
	bundles: readonly {
		readonly artifacts: readonly {
			readonly content: string;
			readonly kind: string;
			readonly path: string;
		}[];
	}[],
): Promise<readonly string[]> {
	const issues: string[] = [];
	for (const bundle of bundles) {
		for (const artifact of bundle.artifacts) {
			if (artifact.kind !== "hook" || !artifact.path.endsWith(".mjs")) {
				continue;
			}
			const process = Bun.spawn(["bun", "-e", artifact.content], {
				stderr: "pipe",
				stdin: "pipe",
				stdout: "pipe",
			});
			process.stdin.write("{}");
			process.stdin.end();
			const [stdout, stderr] = await Promise.all([
				new Response(process.stdout).text(),
				new Response(process.stderr).text(),
				process.exited,
			]);
			try {
				const decision = JSON.parse(stdout) as { readonly decision?: unknown };
				if (typeof decision.decision === "string") {
					continue;
				}
			} catch {
				// Report below.
			}
			issues.push(`${artifact.path}: ${stderr || stdout}`);
		}
	}
	return issues;
}
