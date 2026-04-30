#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { passthrough, readStdin, stopBlock, stopWarn } from "../_lib.mjs";
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
		passthrough();
	} catch {
		passthrough();
	}
})();
