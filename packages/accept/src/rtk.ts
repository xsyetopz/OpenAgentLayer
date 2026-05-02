export const MINIMUM_RTK_GAIN_PERCENT = 80;

export interface RtkGainResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export type RtkGainRunner = (repoRoot: string) => Promise<RtkGainResult>;

const RTK_GAIN_PERCENT_PATTERN = /Tokens saved:\s+.*\((\d+(?:\.\d+)?)%\)/;

export async function assertRtkGainThreshold(
	repoRoot: string,
	runner: RtkGainRunner = runRtkGain,
): Promise<number> {
	const result = await runner(repoRoot);
	if (result.exitCode !== 0)
		throw new Error(
			`rtk gain failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
		);
	const percent = parseRtkGainPercent(result.stdout);
	if (percent < MINIMUM_RTK_GAIN_PERCENT)
		throw new Error(
			`rtk gain ${percent}% is below the required ${MINIMUM_RTK_GAIN_PERCENT}%; reduce noisy commands or improve RTK coverage before release.`,
		);
	return percent;
}

export function parseRtkGainPercent(output: string): number {
	const match = RTK_GAIN_PERCENT_PATTERN.exec(output);
	if (!match)
		throw new Error(
			"rtk gain output did not include a parseable Tokens saved percentage.",
		);
	return Number(match[1]);
}

async function runRtkGain(repoRoot: string): Promise<RtkGainResult> {
	const proc = Bun.spawn(["rtk", "gain"], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { exitCode, stdout, stderr };
}
