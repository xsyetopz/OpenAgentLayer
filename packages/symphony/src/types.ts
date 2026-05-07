export interface Issue {
	id: string;
	identifier: string;
	title: string;
	description: string | null;
	priority: number | null;
	state: string;
	branch_name: string | null;
	url: string | null;
	labels: string[];
	blocked_by: BlockerRef[];
	created_at?: string | null;
	updated_at?: string | null;
}

export interface BlockerRef {
	id: string | null;
	identifier: string | null;
	state: string | null;
	created_at: string | null;
	updated_at: string | null;
}

export interface WorkflowDefinition {
	config: Record<string, unknown>;
	prompt_template: string;
	path: string;
}

export interface SymphonyConfig {
	tracker: {
		kind: "linear";
		endpoint: string;
		api_key: string;
		project_slug: string;
		active_states: string[];
		terminal_states: string[];
	};
	polling: { interval_ms: number };
	workspace: { root: string };
	hooks: WorkspaceHooks;
	agent: {
		max_concurrent_agents: number;
		max_turns: number;
		max_retry_backoff_ms: number;
		max_concurrent_agents_by_state: Record<string, number>;
	};
	codex: {
		command: string;
		approval_policy?: unknown;
		thread_sandbox?: unknown;
		turn_sandbox_policy?: unknown;
		turn_timeout_ms: number;
		read_timeout_ms: number;
		stall_timeout_ms: number;
	};
}

export interface WorkspaceHooks {
	after_create?: string;
	before_run?: string;
	after_run?: string;
	before_remove?: string;
	timeout_ms: number;
}

export interface Workspace {
	path: string;
	workspace_key: string;
	created_now: boolean;
}

export interface RetryEntry {
	issue_id: string;
	identifier: string;
	attempt: number;
	due_at_ms: number;
	timer_handle: unknown | null;
	error: string | null;
}

export interface RunningEntry {
	issue: Issue;
	started_at: number;
	last_codex_timestamp: number | null;
}

export interface OrchestratorState {
	poll_interval_ms: number;
	max_concurrent_agents: number;
	running: Map<string, RunningEntry>;
	claimed: Set<string>;
	retry_attempts: Map<string, RetryEntry>;
	completed: Set<string>;
	codex_totals: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
		runtime_seconds: number;
	};
	codex_rate_limits: unknown;
}

export interface SymphonyTrackerClient {
	fetchCandidateIssues(config: SymphonyConfig): Promise<Issue[]>;
	fetchIssueStates(
		issueIds: string[],
		config: SymphonyConfig,
	): Promise<Issue[]>;
	fetchTerminalIssues(config: SymphonyConfig): Promise<Issue[]>;
}

export interface AgentRunResult {
	status: "succeeded" | "failed" | "timed_out" | "stalled" | "canceled";
	error?: string;
	session_id?: string | undefined;
	thread_id?: string | undefined;
	turn_id?: string | undefined;
	input_tokens?: number;
	output_tokens?: number;
	total_tokens?: number;
	runtime_seconds?: number;
	rate_limits?: unknown;
}

export interface SymphonyAgentRunner {
	run(input: AgentRunInput): Promise<AgentRunResult>;
	cancel?(issueId: string): Promise<void>;
}

export interface AgentRunInput {
	issue: Issue;
	attempt: number | null;
	turn: number;
	workspace: Workspace;
	workflow: WorkflowDefinition;
	config: SymphonyConfig;
	prompt: string;
}

export interface SymphonyLogEntry {
	level: "info" | "warn" | "error";
	event: string;
	issue_id?: string;
	issue_identifier?: string | undefined;
	identifier?: string;
	session_id?: string | undefined;
	message?: string;
	data?: Record<string, unknown>;
}

export type SymphonyLogger = (entry: SymphonyLogEntry) => void;

export class SymphonyConfigError extends Error {
	readonly code:
		| "missing_workflow_file"
		| "workflow_parse_error"
		| "workflow_front_matter_not_a_map"
		| "template_render_error";

	constructor(
		code:
			| "missing_workflow_file"
			| "workflow_parse_error"
			| "workflow_front_matter_not_a_map"
			| "template_render_error",
		message: string,
	) {
		super(message);
		this.code = code;
	}
}
