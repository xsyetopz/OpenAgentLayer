#!/usr/bin/env node
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
	DEFAULT_CAVEMAN_MODE,
	renderManagedCavemanContext,
	resolveCavemanMode,
} from "../_caveman-contract.mjs";

const DEFAULT_MODE = DEFAULT_CAVEMAN_MODE;
const HOME = process.env.HOME || process.env.USERPROFILE || "";
const CONFIG_HOME = process.env.XDG_CONFIG_HOME || join(HOME, ".config");
const SESSION_FILE = join(
	HOME,
	".codex",
	"openagentsbtw",
	"state",
	"caveman-mode",
);
const CONFIG_FILE = join(CONFIG_HOME, "openagentsbtw", "config.env");

function normalizeMode(value = "") {
	return resolveCavemanMode(value);
}

function readConfigEnvValue(key) {
	if (!existsSync(CONFIG_FILE)) return "";
	for (const line of readFileSync(CONFIG_FILE, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const [name, ...valueParts] = trimmed.split("=");
		if (name === key) return valueParts.join("=");
	}
	return "";
}

export function getDefaultMode() {
	return (
		normalizeMode(readConfigEnvValue("OABTW_CAVEMAN_MODE")) || DEFAULT_MODE
	);
}

export function readSessionMode() {
	if (!existsSync(SESSION_FILE)) return getDefaultMode();
	return normalizeMode(readFileSync(SESSION_FILE, "utf8")) || getDefaultMode();
}

function writeSessionMode(mode) {
	const normalized = normalizeMode(mode) || DEFAULT_MODE;
	mkdirSync(join(HOME, ".codex", "openagentsbtw", "state"), {
		recursive: true,
	});
	if (normalized === "off") {
		rmSync(SESSION_FILE, { force: true });
		return "off";
	}
	writeFileSync(SESSION_FILE, `${normalized}\n`);
	return normalized;
}

export function seedSessionMode() {
	return writeSessionMode(getDefaultMode());
}

export function updateSessionMode(prompt = "") {
	const text = String(prompt || "")
		.trim()
		.toLowerCase();
	if (!text) return readSessionMode();
	if (/\b(stop caveman|normal mode)\b/i.test(text)) {
		return writeSessionMode("off");
	}
	const explicit = text.match(
		/(?:^|\s)(?:\$)?caveman(?:\s+mode)?(?:\s+|:)?(off|lite|full|ultra|wenyan-lite|wenyan|wenyan-full|wenyan-ultra)?\b/i,
	);
	if (explicit) {
		return writeSessionMode(
			normalizeMode(explicit[1] || "") || getDefaultMode(),
		);
	}
	if (
		/\b(caveman mode|use caveman|talk like caveman|less tokens|be brief)\b/i.test(
			text,
		)
	) {
		return writeSessionMode(
			getDefaultMode() === "off" ? DEFAULT_MODE : getDefaultMode(),
		);
	}
	return readSessionMode();
}

export function renderCavemanContext(mode = readSessionMode()) {
	return renderManagedCavemanContext(mode || getDefaultMode());
}
