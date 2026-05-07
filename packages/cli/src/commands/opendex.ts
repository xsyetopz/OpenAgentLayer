import { existsSync } from "node:fs";
import { join } from "node:path";

export interface OpenDexRun {
	command: string;
	args: string[];
	cwd: string;
}

export async function runOpenDexCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const dryRun = args.includes("--dry-run");
	const run = opendexRun(
		repoRoot,
		args.filter((arg) => arg !== "--dry-run"),
	);
	if (dryRun) {
		console.log(JSON.stringify(run, undefined, 2));
		return;
	}
	const proc = Bun.spawn([run.command, ...run.args], {
		cwd: run.cwd,
		stdout: "inherit",
		stderr: "inherit",
	});
	const code = await proc.exited;
	if (code !== 0) throw new Error(`opendex exited with code ${code}`);
}

export function opendexRun(repoRoot: string, args: string[] = []): OpenDexRun {
	const debugBinary = join(repoRoot, "target/debug/opendex");
	if (existsSync(debugBinary))
		return {
			command: debugBinary,
			args,
			cwd: repoRoot,
		};
	return {
		command: "cargo",
		args: ["run", "-p", "opendex", "--", ...args],
		cwd: repoRoot,
	};
}
