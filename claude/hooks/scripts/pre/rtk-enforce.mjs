#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { allow, passthrough, readStdin, warn } from "../_lib.mjs";
import { getRtkRewrite } from "../_rtk.mjs";

(async () => {
	try {
		const data = await readStdin();
		if (!data || data.tool_name !== "Bash") passthrough();

		const command = String(data.tool_input?.command || "").trim();
		if (!command) passthrough();

		const rewrite = getRtkRewrite(command, process.cwd());
		if (!rewrite) passthrough();

		if (rewrite.rewritten) {
			allow("RTK auto-rewrite", "PreToolUse", {
				...(data.tool_input || {}),
				command: rewrite.rewritten,
			});
		}
		if (rewrite.warning) {
			warn(rewrite.warning, "PreToolUse");
		}
		passthrough();
	} catch {
		passthrough();
	}
})();
