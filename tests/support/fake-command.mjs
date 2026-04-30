import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";

export function prependBinToPath(binDir, basePath = process.env.PATH ?? "") {
	return basePath ? `${binDir}${delimiter}${basePath}` : binDir;
}

export function writeExecutableSync(binDir, name, { unix, windows }) {
	mkdirSync(binDir, { recursive: true });
	if (process.platform === "win32") {
		const executablePath = join(binDir, `${name}.cmd`);
		writeFileSync(executablePath, windows);
		return executablePath;
	}
	const executablePath = join(binDir, name);
	writeFileSync(executablePath, unix);
	chmodSync(executablePath, 0o755);
	return executablePath;
}
