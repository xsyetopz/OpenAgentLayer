#!/usr/bin/env node
import {
	additionalContext,
	passthrough,
	readStdin,
	stopBlock,
} from "../_lib.mjs";
import { runStopChecks } from "./_stop-shared.mjs";

(async () => {
	const data = await readStdin();
	const result = runStopChecks(data);
	if (result.type === "block") {
		stopBlock(result.message);
	}
	if (result.type === "context") {
		additionalContext(result.message);
	}
	passthrough();
})();
