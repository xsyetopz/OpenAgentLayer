import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
export const runtimeHooks: readonly string[] = [
	"block-caveman-filler.mjs",
	"block-command-safety.mjs",
	"block-demo-artifacts.mjs",
	"block-env-file-access.mjs",
	"block-explanation-only.mjs",
	"block-generated-drift.mjs",
	"block-generated-edits.mjs",
	"block-sentinel-markers.mjs",
	"block-repeated-failures.mjs",
	"block-secret-files.mjs",
	"block-secret-output.mjs",
	"enforce-route-contract.mjs",
	"enforce-rtk-commands.mjs",
	"inject-changed-files.mjs",
	"inject-git-context.mjs",
	"inject-package-scripts.mjs",
	"inject-project-memory.mjs",
	"inject-route-context.mjs",
	"inject-session-scope.mjs",
	"inject-subagent-context.mjs",
	"require-completion-evidence.mjs",
	"require-execution-evidence.mjs",
	"require-source-evidence.mjs",
	"warn-large-diff.mjs",
];
export const privilegedRuntimeScripts: readonly string[] = [
	"privileged-exec.mjs",
	"privileged-exec-client.mjs",
];
export async function assertRuntimeHooksExecutable(
	repoRoot: string,
): Promise<void> {
	const hookRoot = join(repoRoot, "packages/runtime/hooks");
	const discovered = await readdir(hookRoot);
	for (const hookName of runtimeHooks) {
		if (!discovered.includes(hookName))
			throw new Error(`Missing runtime hook \`${hookName}\``);
		const hookStat = await stat(join(hookRoot, hookName));
		if ((hookStat.mode & 0o111) === 0)
			throw new Error(`Runtime hook \`${hookName}\` is not executable`);
	}
	const privilegedRoot = join(repoRoot, "packages/runtime/privileged");
	const privilegedDiscovered = await readdir(privilegedRoot);
	for (const script of privilegedRuntimeScripts) {
		if (!privilegedDiscovered.includes(script))
			throw new Error(`Missing privileged runtime script: \`${script}\``);
		const hookStat = await stat(join(privilegedRoot, script));
		if ((hookStat.mode & 0o111) === 0)
			throw new Error(`Privileged runtime is not executable: \`${script}\``);
	}
}
