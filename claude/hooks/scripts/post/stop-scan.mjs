#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { passthrough, readStdin, stopBlock, stopWarn } from "../_lib.mjs";
import {
	summarizePendingQueue,
	takeNextAutoEntry,
} from "../session/_queue.mjs";
import { runStopChecks } from "./_stop-shared.mjs";

(async () => {
	try {
		const data = await readStdin();
		if (!data || !Object.keys(data).length || data.stop_hook_active) {
			passthrough();
		}

		const result = runStopChecks(data);
		if (result.type === "block") {
			stopBlock(result.message);
		}
		if (result.type === "warn") {
			stopWarn(result.message);
		}

		const options = { cwd: data.cwd || process.cwd() };
		const autoEntry = takeNextAutoEntry(options);
		if (autoEntry?.record) {
			stopBlock(
				`Dispatch queued openagentsbtw message ${autoEntry.record.id}. Treat this as the next user task after the completed task.\n\nTask:\n${autoEntry.record.message}`,
			);
		}
		const queueSummary = summarizePendingQueue(options);
		if (queueSummary) {
			stopWarn(queueSummary);
		}
		passthrough();
	} catch {
		passthrough();
	}
})();
