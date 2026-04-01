import { spawn } from "node:child_process";

function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: "inherit" });
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
		});
	});
}

async function main() {
	await run("node", ["scripts/generate.mjs"]);
	await run("git", [
		"diff",
		"--exit-code",
		"--",
		"claude",
		"codex",
		"opencode",
		"bin/openagentsbtw-codex",
		"bin/oabtw-codex",
	]);
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
