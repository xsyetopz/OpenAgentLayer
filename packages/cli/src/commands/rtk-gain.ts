import { assertRtkGainThreshold } from "@openagentlayer/accept";

export async function runRtkGainCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const allowEmptyHistory = args.includes("--allow-empty-history");
	const fromFile = valueAfter(args, "--from-file");
	const result = await assertRtkGainThreshold(
		repoRoot,
		fromFile ? { allowEmptyHistory, fromFile } : { allowEmptyHistory },
	);
	if (result.status === "empty") {
		console.log(`STATUS PASS ${result.message}`);
		return;
	}
	console.log(`STATUS PASS ${result.message}`);
}

function valueAfter(args: string[], flag: string): string | undefined {
	const index = args.indexOf(flag);
	if (index === -1) return undefined;
	const value = args[index + 1];
	if (!value) throw new Error(`${flag} requires a path.`);
	return value;
}
