#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_ENV_FILES = [
	".env",
	".env.local",
	".env.development",
	".env.production",
];

const DEFAULT_SAFE_PREFIXES = [
	"PUBLIC_",
	"NEXT_PUBLIC_",
	"VITE_",
	"REACT_APP_",
	"EXPO_PUBLIC_",
];

function parseEnvFile(content) {
	const entries = [];
	for (const raw of content.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;

		const equalIndex = line.indexOf("=");
		if (equalIndex < 1) continue;

		const key = line.slice(0, equalIndex).trim();
		let value = line.slice(equalIndex + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (value) entries.push({ key, value });
	}
	return entries;
}

export function loadSecrets(cwd = process.cwd()) {
	const values = new Set();
	const names = new Map();

	for (const file of DEFAULT_ENV_FILES) {
		const fullPath = resolve(cwd, file);
		if (!existsSync(fullPath)) continue;

		try {
			const content = readFileSync(fullPath, "utf8");
			for (const { key, value } of parseEnvFile(content)) {
				if (DEFAULT_SAFE_PREFIXES.some((prefix) => key.startsWith(prefix)))
					continue;
				if (value.length < 8) continue;
				values.add(value);
				names.set(value, key);
			}
		} catch {
			// Best-effort only.
		}
	}

	return { values, names };
}
