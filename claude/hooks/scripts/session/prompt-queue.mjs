#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { readStdin } from "../_lib.mjs";
import {
	addQueueEntry,
	clearQueueEntries,
	formatQueueList,
	listQueueEntries,
	nextPendingEntry,
	parseQueueCommand,
	retryQueueEntry,
} from "./_queue.mjs";

function passthrough() {
	process.exit(0);
}

function blockWithMessage(message) {
	process.stdout.write(
		`${JSON.stringify({ decision: "block", reason: message })}\n`,
	);
	process.exit(2);
}

(async () => {
	try {
		const hookInput = await readStdin();
		const command = parseQueueCommand(hookInput?.prompt ?? "");
		if (!command) passthrough();

		const options = { cwd: hookInput.cwd || process.cwd() };
		if (command.action === "add") {
			const enqueueOutcome = addQueueEntry(command.message, {
				...options,
				auto: command.auto,
			});
			if (!enqueueOutcome.ok) blockWithMessage(enqueueOutcome.message);
			blockWithMessage(
				`Queued ${enqueueOutcome.record.id}${command.auto ? " for auto-dispatch" : ""}: ${enqueueOutcome.record.message}`,
			);
		}

		if (command.action === "list") {
			blockWithMessage(formatQueueList(listQueueEntries(options)));
		}

		if (command.action === "next") {
			const record = nextPendingEntry(options);
			blockWithMessage(
				record
					? `Next queued message ${record.id}:\n${record.message}`
					: "No pending queued messages.",
			);
		}

		if (command.action === "clear") {
			clearQueueEntries(options);
			blockWithMessage("Cancelled pending openagentsbtw queue entries.");
		}

		if (command.action === "retry") {
			const retryOutcome = retryQueueEntry(command.id, options);
			blockWithMessage(
				retryOutcome.ok
					? `Requeued ${retryOutcome.record.id}: ${retryOutcome.record.message}`
					: retryOutcome.message,
			);
		}

		blockWithMessage(command.message || "Invalid queue command.");
	} catch {
		passthrough();
	}
})();
