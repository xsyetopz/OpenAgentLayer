import { doctorHooks, doctorTools, formatDoctorResult } from "../doctor";
import type { CliCommand, CommandResult } from "./types";

export const doctorCommand: CliCommand = {
	name: "doctor",
	summary: "run platform diagnostics",
	usage: "usage: oal doctor <hooks <platform>|tools [--all]>",
	run(args): CommandResult | undefined {
		const [scope, platform] = args;
		if (scope === "tools") {
			const result = doctorTools(process.cwd(), {
				includeOptional: args.includes("--all"),
			});
			console.log(formatDoctorResult(result));
			if (!result.ok) {
				return { exitCode: 1 };
			}
			return undefined;
		}
		if (scope !== "hooks" || !platform) {
			throw new Error(doctorCommand.usage);
		}
		const result = doctorHooks(platform);
		console.log(formatDoctorResult(result));
		if (!result.ok) {
			return { exitCode: 1 };
		}
		return undefined;
	},
};
