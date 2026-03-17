#!/usr/bin/env node
import { auditLog, passthrough, readStdin } from "../_lib.mjs";

function main() {
	const data = readStdin();
	const toolName = data.tool_name ?? "unknown";
	const permission = data.permission ?? data.action ?? "unknown";

	auditLog(
		"PermissionRequest",
		"permission-request.mjs",
		"permission_requested",
		{
			tool: toolName,
			extra: { permission: String(permission).slice(0, 200) },
		},
	);
	passthrough();
}

main();
