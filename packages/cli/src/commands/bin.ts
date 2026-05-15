import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
	applyBinInstall,
	binManifestPath,
	pathContains,
	planBinInstall,
	refineBinPlan,
	removeBinInstall,
} from "@openagentlayer/deploy";
import { OAL_CLI_ENTRY_RELATIVE } from "@openagentlayer/source";
import { flag, option } from "../arguments";

export async function runBinCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const home = resolve(option(args, "--home") ?? homedir());
	const binDir = resolve(option(args, "--bin-dir") ?? join(home, ".local/bin"));
	const entrypoint = join(repoRoot, OAL_CLI_ENTRY_RELATIVE);
	const dryRun = flag(args, "--dry-run");
	if (flag(args, "--remove")) {
		if (dryRun) console.log(`DRY RUN remove ${binManifestPath(home)}`);
		else
			console.log(JSON.stringify(await removeBinInstall(home), undefined, 2));
		return;
	}
	const plan = await refineBinPlan(planBinInstall(binDir, entrypoint));
	console.log(`binary: ${plan.action} ${plan.path} (${plan.reason})`);
	console.log(`manifest: ${binManifestPath(home)}`);
	console.log(`path: ${pathContains(binDir) ? "ready" : `add ${binDir}`}`);
	if (!pathContains(binDir)) console.log(`next: export PATH="${binDir}:$PATH"`);
	if (!dryRun) await applyBinInstall(home, plan, entrypoint);
}
