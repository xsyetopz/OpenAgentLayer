#!/usr/bin/env node
/**
 * Loads secret values from .env files for exact-match redaction.
 * Shared by stream-guard (PreToolUse), bash-redact (PostToolUse), and bin/stream-guard (PTY proxy).
 *
 * @module _env-loader
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

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

const DEFAULT_MIN_LENGTH = 8;

/**
 * Parse a single .env file into key-value pairs.
 * Handles KEY=VALUE, KEY="VALUE", KEY='VALUE', and comments.
 */
function parseEnvFile(content) {
	const entries = [];
	for (const raw of content.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;

		const eqIdx = line.indexOf("=");
		if (eqIdx < 1) continue;

		const key = line.slice(0, eqIdx).trim();
		let val = line.slice(eqIdx + 1).trim();

		// Strip surrounding quotes
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}

		// Strip inline comments (only for unquoted values)
		const hashIdx = val.indexOf(" #");
		if (
			hashIdx > 0 &&
			!raw
				.slice(eqIdx + 1)
				.trim()
				.startsWith('"')
		) {
			val = val.slice(0, hashIdx).trim();
		}

		if (val) entries.push({ key, value: val });
	}
	return entries;
}

/**
 * Load .streamguardrc.json config from cwd or home dir.
 * Falls back to defaults for any missing field.
 */
export function loadStreamGuardConfig(cwd = process.cwd()) {
	const paths = [
		join(cwd, ".streamguardrc.json"),
		join(process.env.HOME || "~", ".streamguardrc.json"),
	];

	for (const p of paths) {
		try {
			if (existsSync(p)) {
				const raw = JSON.parse(readFileSync(p, "utf-8"));
				return {
					enabled: raw.enabled !== false,
					envFiles: raw.envFiles || DEFAULT_ENV_FILES,
					minSecretLength: raw.minSecretLength || DEFAULT_MIN_LENGTH,
					safeEnvPrefixes: raw.safeEnvPrefixes || DEFAULT_SAFE_PREFIXES,
					customPatterns: raw.customPatterns || [],
					verbose: raw.verbose === true,
				};
			}
		} catch {
			// Malformed config, skip
		}
	}

	return {
		enabled: true,
		envFiles: DEFAULT_ENV_FILES,
		minSecretLength: DEFAULT_MIN_LENGTH,
		safeEnvPrefixes: DEFAULT_SAFE_PREFIXES,
		customPatterns: [],
		verbose: false,
	};
}

/**
 * Load secret values from .env files.
 *
 * @param {object} [opts]
 * @param {string} [opts.cwd] - Working directory to resolve .env files from
 * @param {string[]} [opts.envFiles] - List of .env filenames to load
 * @param {number} [opts.minSecretLength] - Minimum value length to treat as secret
 * @param {string[]} [opts.safeEnvPrefixes] - Env var prefixes that are safe (skipped)
 * @returns {{ values: Set<string>, valueToName: Map<string,string>, varNames: Set<string> }}
 */
export function loadSecrets(opts = {}) {
	const cwd = opts.cwd || process.cwd();
	const envFiles = opts.envFiles || DEFAULT_ENV_FILES;
	const minLen = opts.minSecretLength || DEFAULT_MIN_LENGTH;
	const safePrefixes = opts.safeEnvPrefixes || DEFAULT_SAFE_PREFIXES;

	const values = new Set();
	const valueToName = new Map();
	const varNames = new Set();

	for (const file of envFiles) {
		const fullPath = resolve(cwd, file);
		try {
			if (!existsSync(fullPath)) continue;
			const content = readFileSync(fullPath, "utf-8");
			const entries = parseEnvFile(content);

			for (const { key, value } of entries) {
				// Skip safe/public prefixes
				if (safePrefixes.some((pfx) => key.startsWith(pfx))) continue;

				varNames.add(key);

				// Only track values long enough to be meaningful secrets
				if (value.length >= minLen) {
					values.add(value);
					valueToName.set(value, key);
				}
			}
		} catch {
			// File unreadable, skip
		}
	}

	return { values, valueToName, varNames };
}

/**
 * Check if streaming mode is active.
 */
export function isStreamMode() {
	return process.env.CCA_STREAM_MODE === "1";
}
