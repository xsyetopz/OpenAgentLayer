import type { Surface } from "@openagentlayer/types";

export type RuntimeDecisionKind = "allow" | "deny" | "warn" | "context";

export interface RuntimePayload {
	readonly surface?: string;
	readonly event?: string;
	readonly policy_id?: string;
	readonly cwd?: string;
	readonly tool_name?: string;
	readonly tool_input?: unknown;
	readonly command?: string;
	readonly paths?: readonly string[];
	readonly route?: string;
	readonly metadata?: Record<string, unknown>;
}

export interface RuntimeDecision {
	readonly decision: RuntimeDecisionKind;
	readonly policy_id: string;
	readonly message: string;
	readonly context?: Record<string, unknown>;
}

export interface SyntheticHookPayloadOptions {
	readonly surface: Surface;
	readonly event: string;
	readonly policyId: string;
	readonly command?: string;
	readonly toolInput?: unknown;
	readonly metadata?: Record<string, unknown>;
}
