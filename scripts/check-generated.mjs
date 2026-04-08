import { spawn } from "node:child_process";

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: "inherit", ...options });
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
	const outDir = ".build/check-generated";
	await run("node", ["scripts/build.mjs", "--out", outDir]);
	await run("node", ["--test", "tests/test-generated-artifacts.mjs"], {
		env: {
			...process.env,
			OABTW_TEST_BUILD_ROOT: outDir,
		},
	});
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
