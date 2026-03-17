#!/usr/bin/env node
import "./suppress-stderr.mjs";
import { auditLog, passthrough, readStdin } from "./_lib.mjs";

(async () => {
	try {
		const data = await readStdin();
		const toolName = data.tool_name ?? "unknown";
		const permission = data.permission ?? data.action ?? "unknown";

		auditLog(
			"PermissionRequest",
			"permission-request.mjs",
			"permission_requested",
			"",
			toolName,
			{ permission: String(permission).slice(0, 200) },
		);
		passthrough();
	} catch {
		passthrough();
	}
})();
