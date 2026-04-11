#!/usr/bin/env node
import { additionalContext, passthrough, readStdin } from "../_lib.mjs";

(async () => {
	const data = await readStdin();
	const source = String(data.source ?? "").trim();
	if (source !== "resume" && source !== "startup") passthrough();
	additionalContext(
		"openagentsbtw Copilot session started from native resume/startup. Prefer native continuation state over restating prior work, and keep current route, concrete edits, commands run, and blockers explicit.",
	);
	passthrough();
})();
