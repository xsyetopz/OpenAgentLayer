#!/usr/bin/env node
import { passthrough, readStdin } from "../_lib.mjs";

(async () => {
	// Best-effort compatibility hook. Keep silent unless we have a concrete warning.
	await readStdin();
	passthrough();
})();
