export const MINIMUM_RTK_GAIN_PERCENT = 80;

export interface RtkGainResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export type RtkGainRunner = (repoRoot: string) => Promise<RtkGainResult>;

export interface RtkGainOptions {
	allowEmptyHistory?: boolean;
	fromFile?: string;
}

export interface RtkGainAssessment {
	status: "pass" | "empty";
	percent: number;
	totalCommands: number;
	message: string;
}

const RTK_GAIN_PERCENT_PATTERN = /Tokens saved:\s+.*\((\d+(?:\.\d+)?)%\)/;
const RTK_GAIN_TOTAL_COMMANDS_PATTERN = /Total commands:\s+(\d+)/;

export async function assertRtkGainThreshold(
	repoRoot: string,
	options: RtkGainOptions = {},
	runner: RtkGainRunner = runRtkGain,
): Promise<RtkGainAssessment> {
	const result = options.fromFile
		? {
				exitCode: 0,
				stdout: await Bun.file(options.fromFile).text(),
				stderr: "",
			}
		: await runner(repoRoot);
	if (result.exitCode !== 0)
		throw new Error(
			`rtk gain failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
		);
	return evaluateRtkGainOutput(result.stdout, options);
}

export function parseRtkGainPercent(output: string): number {
	const match = RTK_GAIN_PERCENT_PATTERN.exec(output);
	if (!match)
		throw new Error(
			"rtk gain output did not include a parseable Tokens saved percentage.",
		);
	return Number(match[1]);
}

export function parseRtkGainTotalCommands(output: string): number {
	const match = RTK_GAIN_TOTAL_COMMANDS_PATTERN.exec(output);
	if (!match)
		throw new Error("rtk gain output did not include Total commands.");
	return Number(match[1]);
}

export function evaluateRtkGainOutput(
	output: string,
	options: RtkGainOptions = {},
): RtkGainAssessment {
	const totalCommands = parseRtkGainTotalCommands(output);
	const percent = parseRtkGainPercent(output);
	if (totalCommands === 0) {
		if (options.allowEmptyHistory)
			return {
				status: "empty",
				percent,
				totalCommands,
				message:
					"rtk gain has no command history; threshold check skipped for fresh runner.",
			};
		throw new Error(
			"rtk gain has no command history; run RTK-wrapped commands before enforcing the 80% threshold.",
		);
	}
	if (percent < MINIMUM_RTK_GAIN_PERCENT)
		throw new Error(
			`rtk gain ${percent}% is below the required ${MINIMUM_RTK_GAIN_PERCENT}%; reduce noisy commands or improve RTK coverage before release.`,
		);
	return {
		status: "pass",
		percent,
		totalCommands,
		message: `rtk gain ${percent}% meets the required ${MINIMUM_RTK_GAIN_PERCENT}%.`,
	};
}

export function assertRtkGainPolicyFixtures(): void {
	evaluateRtkGainOutput(
		"Total commands:    1\nTokens saved:      10K (92.9%)\n",
	);
	evaluateRtkGainOutput(
		"Total commands:    1\nTokens saved:      10K (80.0%)\n",
	);
	evaluateRtkGainOutput("Total commands:    0\nTokens saved:      0 (0%)\n", {
		allowEmptyHistory: true,
	});
	for (const [name, output] of [
		[
			"below threshold",
			"Total commands:    1\nTokens saved:      10K (79.9%)\n",
		],
		["empty history", "Total commands:    0\nTokens saved:      0 (0%)\n"],
		["missing percent", "Total commands:    1\nRTK Token Savings\n"],
	] as const) {
		try {
			evaluateRtkGainOutput(output);
		} catch {
			continue;
		}
		throw new Error(`RTK gain policy fixture did not fail: ${name}`);
	}
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
