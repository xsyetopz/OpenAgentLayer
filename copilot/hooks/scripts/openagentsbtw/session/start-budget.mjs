#!/usr/bin/env node
import { additionalContext, passthrough, readStdin } from "../_lib.mjs";
import { renderCavemanContext, seedSessionMode } from "./_caveman.mjs";

(async () => {
	const data = await readStdin();
	const source = String(data.source ?? "").trim();
	if (source !== "resume" && source !== "startup") passthrough();
	const cavemanContext = renderCavemanContext(seedSessionMode());
	additionalContext(
		[
			"openagentsbtw Copilot session started from native resume/startup. Prefer native continuation state over restating prior work, and keep current route, concrete edits, commands run, and blockers explicit.",
			cavemanContext,
		]
			.filter(Boolean)
			.join("\n\n"),
	);
	passthrough();
})();
