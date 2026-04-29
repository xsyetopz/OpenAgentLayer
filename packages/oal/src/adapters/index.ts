import { claudeAdapter } from "./claude";
import { codexAdapter } from "./codex";
import type { PlatformAdapter } from "./types";

export const adapters: PlatformAdapter[] = [codexAdapter, claudeAdapter];

export function adapterFor(platform: string): PlatformAdapter | undefined {
	return adapters.find((adapter) => adapter.id === platform);
}
