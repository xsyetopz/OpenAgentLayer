#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { CodexCommandRunner } from "./runner/codex";
import { SymphonyService } from "./service";
import { LinearTrackerClient } from "./tracker/linear";
import type { SymphonyLogEntry } from "./types";

export async function symphonyCliMain(argv = process.argv): Promise<number> {
	const workflowPath = resolve(argv[2] ?? "WORKFLOW.md");
	if (!existsSync(workflowPath)) {
		console.error(`Symphony workflow file does not exist: ${workflowPath}`);
		return 1;
	}
	const service = new SymphonyService({
		workflowPath,
		tracker: new LinearTrackerClient(),
		runner: new CodexCommandRunner(),
		logger: logJson,
	});
	const stop = async () => {
		await service.stop();
	};
	process.once("SIGINT", stop);
	process.once("SIGTERM", stop);
	try {
		await service.start();
		return 0;
	} catch (error) {
		console.error(`Symphony startup failed: ${String(error)}`);
		return 1;
	}
}

function logJson(entry: SymphonyLogEntry): void {
	try {
		console.log(JSON.stringify({ time: new Date().toISOString(), ...entry }));
	} catch {
		// Logging sink failures must not crash orchestration.
	}
}

if (import.meta.main) {
	const exitCode = await symphonyCliMain();
	if (exitCode !== 0) process.exit(exitCode);
}
