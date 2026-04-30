import type { Diagnostic } from "@openagentlayer/types";

export function printDiagnostics(diagnostics: readonly Diagnostic[]): void {
	for (const diagnostic of diagnostics) {
		const path = diagnostic.path === undefined ? "" : `${diagnostic.path}: `;
		const output = `${diagnostic.level.toUpperCase()} ${diagnostic.code}: ${path}${diagnostic.message}`;
		if (diagnostic.level === "error") {
			console.error(output);
		} else {
			console.warn(output);
		}
	}
}

export function printHelp(): void {
	console.log(
		"Usage: oal <check|render|install|uninstall|doctor> [--root <dir>] [--out <dir>] [--surface <surface|all>] [--scope <project|global>] [--target <dir>] [--dry-run]",
	);
}

export function printError(message: string): void {
	console.error(`ERROR: ${message}`);
}
