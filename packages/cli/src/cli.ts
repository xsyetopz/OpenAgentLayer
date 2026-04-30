#!/usr/bin/env bun
import { main } from "./main";
import { printError } from "./output";

const exitCode = await main(Bun.argv.slice(2)).catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	printError(message);
	return message.startsWith("config-conflict:") ? 1 : 2;
});

process.exit(exitCode);
