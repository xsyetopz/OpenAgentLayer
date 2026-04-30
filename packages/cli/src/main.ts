import {
	checkCommand,
	doctorCommand,
	installCommand,
	renderCommand,
	uninstallCommand,
} from "./commands";
import { parseOptions } from "./options";
import { printError, printHelp } from "./output";

const COMMANDS = new Set([
	"check",
	"render",
	"install",
	"uninstall",
	"doctor",
	"help",
]);

export async function main(args: readonly string[]): Promise<number> {
	const [command = "help", ...rest] = args;
	if (!COMMANDS.has(command)) {
		printError(`Unknown command '${command}'.`);
		printHelp();
		return 2;
	}

	const options = parseOptions(rest);
	switch (command) {
		case "check":
			return await checkCommand(options);
		case "render":
			return await renderCommand(options);
		case "doctor":
			return await doctorCommand(options);
		case "install":
			return await installCommand(options);
		case "uninstall":
			return await uninstallCommand(options);
		case "help":
			printHelp();
			return 0;
		default:
			return 2;
	}
}
