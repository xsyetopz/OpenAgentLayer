#!/usr/bin/env node
import {
	deny,
	passthrough,
	readStdin,
	resolveToolInput,
	resolveToolName,
} from "../_lib.mjs";

(async () => {
	const data = await readStdin();
	const toolName = resolveToolName(data).toLowerCase();
	const input = resolveToolInput(data);

	if (!toolName) passthrough();

	if (
		(toolName === "read" || toolName === "view") &&
		!input?.path &&
		!input?.filePath
	) {
		deny(`Tool '${toolName}' is missing a target path.`);
	}

	if (
		(toolName === "edit" || toolName === "write" || toolName === "create") &&
		!input?.path &&
		!input?.filePath
	) {
		deny(`Tool '${toolName}' is missing a file path.`);
	}

	if (
		(toolName === "bash" || toolName === "shell") &&
		!String(input?.command || input?.cmd || "").trim()
	) {
		deny(`Tool '${toolName}' is missing a command string.`);
	}

	passthrough();
})();
