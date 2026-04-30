#!/usr/bin/env node
import {
	deny,
	passthrough,
	readStdin,
	resolveCwd,
	resolveToolInput,
	resolveToolName,
} from "../_lib.mjs";
import { getRtkRewrite } from "../_rtk.mjs";

(async () => {
	const data = await readStdin();
	const toolName = resolveToolName(data).toLowerCase();
	if (!toolName || (toolName !== "bash" && toolName !== "shell")) passthrough();

	const input = resolveToolInput(data);
	const command = String(input?.command || input?.cmd || "").trim();
	if (!command) passthrough();

	const rewrite = getRtkRewrite(command, resolveCwd(data));
	if (!rewrite) passthrough();

	deny(`RTK is required when RTK.md is present. Use: ${rewrite.rewritten}`);
})();
