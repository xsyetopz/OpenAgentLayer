#!/usr/bin/env node
import { passthrough, readStdin } from "../_lib.mjs";

(async () => {
	await readStdin();
	passthrough();
})();
