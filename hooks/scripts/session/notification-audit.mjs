#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { auditLog, passthrough, readStdin } from "../_lib.mjs";

(async () => {
	try {
		const data = await readStdin();
		const message = data.message ?? data.notification ?? "";

		auditLog(
			"Notification",
			"notification.mjs",
			"notified",
			message ? String(message).slice(0, 200) : "empty",
		);
		passthrough();
	} catch {
		passthrough();
	}
})();
