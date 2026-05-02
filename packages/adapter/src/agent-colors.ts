const AGENT_HEX_COLORS: Record<string, string> = {
	aphrodite: "#e11d48",
	apollo: "#f59e0b",
	ares: "#dc2626",
	artemis: "#16a34a",
	asclepius: "#14b8a6",
	atalanta: "#84cc16",
	athena: "#2563eb",
	calliope: "#db2777",
	chronos: "#64748b",
	daedalus: "#ca8a04",
	demeter: "#65a30d",
	dionysus: "#9333ea",
	hecate: "#7c3aed",
	hephaestus: "#ea580c",
	hermes: "#0d9488",
	hestia: "#f97316",
	janus: "#0891b2",
	mnemosyne: "#4f46e5",
	morpheus: "#6366f1",
	nemesis: "#be123c",
	odysseus: "#0284c7",
	prometheus: "#b45309",
	themis: "#059669",
};

const FALLBACK_COLOR_COUNT = 0xffffff;

export function agentHexColor(agentId: string): string {
	const knownColor = AGENT_HEX_COLORS[agentId];
	if (knownColor) return knownColor;
	return `#${hashAgentId(agentId).toString(16).padStart(6, "0")}`;
}

function hashAgentId(agentId: string): number {
	let hash = 0;
	for (const character of agentId)
		hash = (hash * 31 + character.charCodeAt(0)) % FALLBACK_COLOR_COUNT;
	return hash;
}
