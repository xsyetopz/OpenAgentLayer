export const DEFAULT_CAVEMAN_MODE = "full";

export const CAVEMAN_MODES = [
	"off",
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan",
	"wenyan-ultra",
];

export const CAVEMAN_MODE_ALIASES = {
	"wenyan-full": "wenyan",
	normal: "off",
};

export function resolveCavemanMode(value = "") {
	const normalized = String(value || "").trim().toLowerCase();
	if (!normalized) return "";
	if (CAVEMAN_MODES.includes(normalized)) return normalized;
	return CAVEMAN_MODE_ALIASES[normalized] ?? "";
}
