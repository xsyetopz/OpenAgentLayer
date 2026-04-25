#!/usr/bin/env node
import { deny, passthrough, readStdin, systemMessage } from "../_lib.mjs";
import { getRtkRewrite } from "../_rtk.mjs";

(async () => {
	const data = await readStdin();
	if (data.tool_name !== "Bash") passthrough();

	const command = String(data.tool_input?.command || "").trim();
	if (!command) passthrough();

	const rewrite = getRtkRewrite(command, data.cwd || process.cwd());
	if (!rewrite) passthrough();

	if (rewrite.rewritten) {
		deny(`RTK is required when RTK.md is present. Use: ${rewrite.rewritten}`);
	}
	if (rewrite.warning) {
		systemMessage(rewrite.warning);
	}
	passthrough();
})();
