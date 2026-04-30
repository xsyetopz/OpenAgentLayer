#!/usr/bin/env node
import {
	addQueueEntry,
	clearQueueEntries,
	formatQueueList,
	listQueueEntries,
	nextPendingEntry,
	retryQueueEntry,
} from "./_queue.mjs";

function usage() {
	process.stderr.write(
		"Usage: queue-manage.mjs <list|add|next|clear|retry> [message|id]\n",
	);
	process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
const options = { cwd: process.cwd() };

switch (command) {
	case "list":
		process.stdout.write(`${formatQueueList(listQueueEntries(options))}\n`);
		break;
	case "add": {
		const enqueueOutcome = addQueueEntry(args.join(" "), options);
		if (!enqueueOutcome.ok) {
			process.stderr.write(`${enqueueOutcome.message}\n`);
			process.exit(1);
		}
		process.stdout.write(
			`Queued ${enqueueOutcome.record.id}: ${enqueueOutcome.record.message}\n`,
		);
		break;
	}
	case "next": {
		const record = nextPendingEntry(options);
		process.stdout.write(
			record
				? `${record.id}: ${record.message}\n`
				: "No pending queued messages.\n",
		);
		break;
	}
	case "clear":
		clearQueueEntries(options);
		process.stdout.write("Cancelled pending openagentsbtw queue entries.\n");
		break;
	case "retry": {
		const id = args[0] || "";
		const retryOutcome = retryQueueEntry(id, options);
		if (!retryOutcome.ok) {
			process.stderr.write(`${retryOutcome.message}\n`);
			process.exit(1);
		}
		process.stdout.write(
			`Requeued ${retryOutcome.record.id}: ${retryOutcome.record.message}\n`,
		);
		break;
	}
	default:
		usage();
}
