import { symphonyCliMain } from "../../../symphony/src/cli";

export async function runSymphonyCommand(args: string[]): Promise<void> {
	const exitCode = await symphonyCliMain(["oal", "symphony", ...args]);
	if (exitCode !== 0)
		throw new Error(`Symphony exited with status \`${exitCode}\``);
}
