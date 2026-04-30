import { extractStringMetadata } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

interface DriftManifestEntry {
	readonly path: string;
	readonly sha256: string;
}

interface DriftManifest {
	readonly targetRoot?: string;
	readonly entries?: readonly DriftManifestEntry[];
}

const TRAILING_SLASH_PATTERN = /\/$/u;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:/u;
const PATH_SEPARATOR_PATTERN = /[\\/]/u;

export async function evaluateSourceDriftGuard(
	payload: RuntimePayload,
): Promise<RuntimeDecision> {
	const manifestPath = extractStringMetadata(payload, "manifest_path");
	const targetRoot =
		extractStringMetadata(payload, "target_root") ??
		payload.cwd ??
		process.cwd();
	const manifestPaths =
		manifestPath === undefined
			? await discoverManifestPaths(targetRoot)
			: [manifestPath];
	if (manifestPaths.length === 0) {
		return {
			decision: "deny",
			policy_id: payload.policy_id ?? "source-drift-guard",
			message: "Source drift guard failed: no managed manifest found.",
		};
	}

	const issues: string[] = [];
	for (const path of manifestPaths) {
		const manifestFile = Bun.file(path);
		if (!(await manifestFile.exists())) {
			issues.push(`missing-manifest:${path}`);
			continue;
		}
		const manifest = JSON.parse(await manifestFile.text()) as DriftManifest;
		for (const entry of manifest.entries ?? []) {
			if (!isSafeRelativePath(entry.path)) {
				issues.push(`path-escape:${entry.path}`);
				continue;
			}
			const filePath = `${targetRoot.replace(TRAILING_SLASH_PATTERN, "")}/${entry.path}`;
			const file = Bun.file(filePath);
			if (!(await file.exists())) {
				issues.push(`missing:${entry.path}`);
				continue;
			}
			const actualSha = await sha256(await file.text());
			if (actualSha !== entry.sha256) {
				issues.push(`changed:${entry.path}`);
			}
		}
	}

	if (issues.length > 0) {
		return {
			context: { issues },
			decision: "deny",
			policy_id: payload.policy_id ?? "source-drift-guard",
			message: `Managed install drift detected: ${issues.join(", ")}`,
		};
	}

	return {
		decision: "allow",
		policy_id: payload.policy_id ?? "source-drift-guard",
		message: "Managed install matches manifest.",
	};
}

async function sha256(content: string): Promise<string> {
	const bytes = new TextEncoder().encode(content);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function discoverManifestPaths(
	targetRoot: string,
): Promise<readonly string[]> {
	const root = targetRoot.replace(TRAILING_SLASH_PATTERN, "");
	const candidates = [
		"codex-project",
		"claude-project",
		"opencode-project",
		"codex-global",
		"claude-global",
		"opencode-global",
	].map((name) => `${root}/.oal/manifest/${name}.json`);
	const existing: string[] = [];
	for (const candidate of candidates) {
		if (await Bun.file(candidate).exists()) {
			existing.push(candidate);
		}
	}
	return existing;
}

function isSafeRelativePath(path: string): boolean {
	return !(
		path.startsWith("/") ||
		WINDOWS_ABSOLUTE_PATH_PATTERN.test(path) ||
		path.split(PATH_SEPARATOR_PATTERN).includes("..")
	);
}
