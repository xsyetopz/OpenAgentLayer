export type OpenDexWorkerRole = "worker" | "qa";
export type OpenDexAgentRole = "orchestrator" | OpenDexWorkerRole;
export type OpenDexAgentStatus =
	| "running"
	| "waiting"
	| "stopped"
	| "approved"
	| "blocked"
	| "archived";
export type OpenDexArtifactKind =
	| "handoff"
	| "diff"
	| "screenshot"
	| "image"
	| "reference-design"
	| "golden"
	| "log";
export type OpenDexDecisionKind = "approved" | "continue" | "blocked";
export type OpenDexEventKind =
	| "project_registered"
	| "orchestrator_attached"
	| "agent_spawned"
	| "message_recorded"
	| "artifact_recorded"
	| "worker_routed"
	| "continuation_decided"
	| "agent_archived";

export interface OpenDexProjectInput {
	id?: string;
	name: string;
	root: string;
	orchestratorThreadId?: string;
}

export interface OpenDexSpawnInput {
	role: OpenDexWorkerRole;
	task: string;
	displayName?: string;
	threadId?: string;
	ownedPaths?: string[];
	expectedEvidence?: string[];
	parentThreadId?: string;
}

export interface OpenDexMessageInput {
	text: string;
	final?: boolean;
	artifactIds?: string[];
}

export interface OpenDexArtifactInput {
	kind: OpenDexArtifactKind;
	path?: string;
	title?: string;
	description?: string;
	metadata?: Record<string, unknown>;
}

export interface OpenDexDecisionInput {
	kind: OpenDexDecisionKind;
	note?: string;
}

export interface OpenDexProject {
	id: string;
	name: string;
	root: string;
	orchestrator_thread_id: string | null;
	agents: OpenDexAgent[];
	inbox: OpenDexInboxEntry[];
	events: OpenDexEvent[];
	created_at_ms: number;
}

export interface OpenDexAgent {
	id: string;
	project_id: string;
	role: OpenDexAgentRole;
	thread_id: string;
	parent_thread_id: string | null;
	display_name: string;
	task: string;
	status: OpenDexAgentStatus;
	owned_paths: string[];
	expected_evidence: string[];
	artifacts: OpenDexArtifact[];
	messages: OpenDexMessage[];
	created_at_ms: number;
	archived_at_ms: number | null;
}

export interface OpenDexMessage {
	id: string;
	thread_id: string;
	text: string;
	final: boolean;
	artifact_ids: string[];
	created_at_ms: number;
}

export interface OpenDexArtifact {
	id: string;
	thread_id: string;
	project_id: string;
	kind: OpenDexArtifactKind;
	path: string | null;
	title: string | null;
	description: string | null;
	metadata: Record<string, unknown>;
	created_at_ms: number;
}

export interface OpenDexInboxEntry {
	id: string;
	project_id: string;
	orchestrator_thread_id: string;
	worker_thread_id: string;
	agent_id: string;
	message_id: string;
	artifact_ids: string[];
	created_at_ms: number;
}

export interface OpenDexEvent {
	id: string;
	project_id: string;
	kind: OpenDexEventKind;
	thread_id: string | null;
	agent_id: string | null;
	message: string | null;
	metadata: Record<string, unknown>;
	created_at_ms: number;
}

interface StoredProject extends Omit<OpenDexProject, "agents" | "events"> {
	agents: Map<string, OpenDexAgent>;
	events: OpenDexEvent[];
}

export class OpenDexControlPlane {
	readonly #projects = new Map<string, StoredProject>();
	readonly #agentsByThread = new Map<string, OpenDexAgent>();
	readonly #nowMs: () => number;
	#sequence = 0;

	constructor(options: { nowMs?: () => number } = {}) {
		this.#nowMs = options.nowMs ?? Date.now;
	}

	registerProject(input: OpenDexProjectInput): OpenDexProject {
		const id = input.id ?? this.#nextId("project");
		if (this.#projects.has(id))
			throw new Error(`OpenDex project exists: ${id}`);
		const project: StoredProject = {
			id,
			name: input.name,
			root: input.root,
			orchestrator_thread_id: input.orchestratorThreadId ?? null,
			agents: new Map(),
			inbox: [],
			events: [],
			created_at_ms: this.#now(),
		};
		this.#projects.set(id, project);
		this.#recordEvent(project, "project_registered", null, null, null, {});
		if (input.orchestratorThreadId)
			this.#recordEvent(
				project,
				"orchestrator_attached",
				input.orchestratorThreadId,
				null,
				null,
				{},
			);
		return this.#snapshotProject(project);
	}

	attachOrchestrator(projectId: string, threadId: string): OpenDexProject {
		const project = this.#project(projectId);
		project.orchestrator_thread_id = threadId;
		this.#recordEvent(
			project,
			"orchestrator_attached",
			threadId,
			null,
			null,
			{},
		);
		return this.#snapshotProject(project);
	}

	spawnAgent(
		projectId: string,
		orchestratorThreadId: string,
		input: OpenDexSpawnInput,
	): OpenDexAgent {
		const project = this.#project(projectId);
		this.#assertOrchestrator(project, orchestratorThreadId);
		const threadId = input.threadId ?? this.#nextId("thread");
		if (this.#agentsByThread.has(threadId))
			throw new Error(`OpenDex thread already exists: ${threadId}`);
		const agent: OpenDexAgent = {
			id: this.#nextId("agent"),
			project_id: project.id,
			role: input.role,
			thread_id: threadId,
			parent_thread_id: input.parentThreadId ?? orchestratorThreadId,
			display_name: input.displayName ?? input.role,
			task: input.task,
			status: "running",
			owned_paths: input.ownedPaths ?? [],
			expected_evidence: input.expectedEvidence ?? [],
			artifacts: [],
			messages: [],
			created_at_ms: this.#now(),
			archived_at_ms: null,
		};
		project.agents.set(agent.id, agent);
		this.#agentsByThread.set(threadId, agent);
		this.#recordEvent(project, "agent_spawned", threadId, agent.id, null, {
			role: input.role,
		});
		return this.#copyAgent(agent);
	}

	recordArtifact(
		threadId: string,
		input: OpenDexArtifactInput,
	): OpenDexArtifact {
		const { project, agent } = this.#agentByThread(threadId);
		const artifact: OpenDexArtifact = {
			id: this.#nextId("artifact"),
			thread_id: threadId,
			project_id: project.id,
			kind: input.kind,
			path: input.path ?? null,
			title: input.title ?? null,
			description: input.description ?? null,
			metadata: input.metadata ?? {},
			created_at_ms: this.#now(),
		};
		agent.artifacts.push(artifact);
		this.#recordEvent(project, "artifact_recorded", threadId, agent.id, null, {
			artifact_id: artifact.id,
			kind: artifact.kind,
		});
		return { ...artifact, metadata: { ...artifact.metadata } };
	}

	recordMessage(threadId: string, input: OpenDexMessageInput): OpenDexMessage {
		const { project, agent } = this.#agentByThread(threadId);
		const artifactIds = input.artifactIds ?? [];
		for (const artifactId of artifactIds) {
			if (!agent.artifacts.some((artifact) => artifact.id === artifactId))
				throw new Error(
					`OpenDex artifact is not owned by ${threadId}: ${artifactId}`,
				);
		}
		const message: OpenDexMessage = {
			id: this.#nextId("message"),
			thread_id: threadId,
			text: input.text,
			final: input.final ?? false,
			artifact_ids: artifactIds,
			created_at_ms: this.#now(),
		};
		agent.messages.push(message);
		this.#recordEvent(project, "message_recorded", threadId, agent.id, null, {
			message_id: message.id,
			final: message.final,
		});
		if (message.final) this.#routeFinalWorkerMessage(project, agent, message);
		return { ...message, artifact_ids: [...message.artifact_ids] };
	}

	decideContinuation(
		orchestratorThreadId: string,
		workerThreadId: string,
		input: OpenDexDecisionInput,
	): OpenDexAgent {
		const { project, agent } = this.#agentByThread(workerThreadId);
		this.#assertOrchestrator(project, orchestratorThreadId);
		if (input.kind === "continue") agent.status = "running";
		if (input.kind === "approved") agent.status = "approved";
		if (input.kind === "blocked") agent.status = "blocked";
		this.#recordEvent(
			project,
			"continuation_decided",
			workerThreadId,
			agent.id,
			input.note ?? null,
			{ decision: input.kind },
		);
		return this.#copyAgent(agent);
	}

	archiveAgent(
		orchestratorThreadId: string,
		workerThreadId: string,
	): OpenDexAgent {
		const { project, agent } = this.#agentByThread(workerThreadId);
		this.#assertOrchestrator(project, orchestratorThreadId);
		agent.status = "archived";
		agent.archived_at_ms = this.#now();
		this.#recordEvent(
			project,
			"agent_archived",
			workerThreadId,
			agent.id,
			null,
			{},
		);
		return this.#copyAgent(agent);
	}

	project(projectId: string): OpenDexProject {
		return this.#snapshotProject(this.#project(projectId));
	}

	snapshot(): OpenDexProject[] {
		return [...this.#projects.values()].map((project) =>
			this.#snapshotProject(project),
		);
	}

	#routeFinalWorkerMessage(
		project: StoredProject,
		agent: OpenDexAgent,
		message: OpenDexMessage,
	): void {
		if (!project.orchestrator_thread_id)
			throw new Error(`OpenDex project has no orchestrator: ${project.id}`);
		agent.status = "waiting";
		const entry: OpenDexInboxEntry = {
			id: this.#nextId("inbox"),
			project_id: project.id,
			orchestrator_thread_id: project.orchestrator_thread_id,
			worker_thread_id: agent.thread_id,
			agent_id: agent.id,
			message_id: message.id,
			artifact_ids: [...message.artifact_ids],
			created_at_ms: this.#now(),
		};
		project.inbox.push(entry);
		this.#recordEvent(
			project,
			"worker_routed",
			agent.thread_id,
			agent.id,
			null,
			{ inbox_id: entry.id, message_id: message.id },
		);
	}

	#assertOrchestrator(
		project: StoredProject,
		orchestratorThreadId: string,
	): void {
		if (project.orchestrator_thread_id !== orchestratorThreadId)
			throw new Error(
				`OpenDex orchestrator mismatch for ${project.id}: ${orchestratorThreadId}`,
			);
	}

	#agentByThread(threadId: string): {
		project: StoredProject;
		agent: OpenDexAgent;
	} {
		const agent = this.#agentsByThread.get(threadId);
		if (!agent) throw new Error(`OpenDex thread not found: ${threadId}`);
		return { project: this.#project(agent.project_id), agent };
	}

	#project(projectId: string): StoredProject {
		const project = this.#projects.get(projectId);
		if (!project) throw new Error(`OpenDex project not found: ${projectId}`);
		return project;
	}

	#recordEvent(
		project: StoredProject,
		kind: OpenDexEventKind,
		threadId: string | null,
		agentId: string | null,
		message: string | null,
		metadata: Record<string, unknown>,
	): void {
		project.events.push({
			id: this.#nextId("event"),
			project_id: project.id,
			kind,
			thread_id: threadId,
			agent_id: agentId,
			message,
			metadata,
			created_at_ms: this.#now(),
		});
	}

	#snapshotProject(project: StoredProject): OpenDexProject {
		return {
			id: project.id,
			name: project.name,
			root: project.root,
			orchestrator_thread_id: project.orchestrator_thread_id,
			agents: [...project.agents.values()].map((agent) =>
				this.#copyAgent(agent),
			),
			inbox: project.inbox.map((entry) => ({
				...entry,
				artifact_ids: [...entry.artifact_ids],
			})),
			events: project.events.map((event) => ({
				...event,
				metadata: { ...event.metadata },
			})),
			created_at_ms: project.created_at_ms,
		};
	}

	#copyAgent(agent: OpenDexAgent): OpenDexAgent {
		return {
			...agent,
			owned_paths: [...agent.owned_paths],
			expected_evidence: [...agent.expected_evidence],
			artifacts: agent.artifacts.map((artifact) => ({
				...artifact,
				metadata: { ...artifact.metadata },
			})),
			messages: agent.messages.map((message) => ({
				...message,
				artifact_ids: [...message.artifact_ids],
			})),
		};
	}

	#nextId(prefix: string): string {
		this.#sequence += 1;
		return `${prefix}-${this.#sequence}`;
	}

	#now(): number {
		return this.#nowMs();
	}
}
