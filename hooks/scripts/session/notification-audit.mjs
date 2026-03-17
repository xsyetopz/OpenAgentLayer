#!/usr/bin/env node
import { auditLog, passthrough, readStdin } from "../_lib.mjs";

function main() {
	const data = readStdin();
	const message = data.message ?? data.notification ?? "";

	auditLog("Notification", "notification.mjs", "notified", {
		reason: message ? String(message).slice(0, 200) : "empty",
	});
	passthrough();
}

main();
