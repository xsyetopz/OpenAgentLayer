import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type {
	AgentRunInput,
	AgentRunResult,
	SymphonyAgentRunner,
	SymphonyConfig,
} from "../types";

export class CodexCommandRunner implements SymphonyAgentRunner {
	async run(input: AgentRunInput): Promise<AgentRunResult> {
		const started = Date.now();
		const client = new CodexAppServerJsonlClient(
			input.config,
			input.workspace.path,
		);
		try {
			await client.start();
			const result = await client.runTurn(input.prompt);
			const runResult: AgentRunResult = {
				status: result.status,
				runtime_seconds: (Date.now() - started) / 1000,
			};
			if (result.error !== undefined) runResult.error = result.error;
			if (result.sessionId !== undefined)
				runResult.session_id = result.sessionId;
			if (result.threadId !== undefined) runResult.thread_id = result.threadId;
			if (result.turnId !== undefined) runResult.turn_id = result.turnId;
			if (result.inputTokens !== undefined)
				runResult.input_tokens = result.inputTokens;
			if (result.outputTokens !== undefined)
				runResult.output_tokens = result.outputTokens;
			if (result.totalTokens !== undefined)
				runResult.total_tokens = result.totalTokens;
			if (result.rateLimits !== undefined)
				runResult.rate_limits = result.rateLimits;
			return runResult;
		} catch (error) {
			return {
				status: String(error).includes("timed out") ? "timed_out" : "failed",
				error: String(error),
				runtime_seconds: (Date.now() - started) / 1000,
			};
		} finally {
			client.stop();
		}
	}
}

export function codexLaunchCommand(config: SymphonyConfig): {
	command: string;
	args: string[];
} {
	return { command: "bash", args: ["-lc", config.codex.command] };
}

interface JsonRpcMessage {
	id?: number | string;
	method?: string;
	params?: Record<string, unknown>;
	response?: unknown;
	result?: unknown;
	error?: { message?: string };
}

interface TurnRunSummary {
	status: AgentRunResult["status"];
	error?: string;
	sessionId?: string;
	threadId?: string;
	turnId?: string;
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	rateLimits?: unknown;
}

class CodexAppServerJsonlClient {
	readonly #config: SymphonyConfig;
	readonly #cwd: string;
	#child: ReturnType<typeof spawn> | null = null;
	#nextId = 1;
	#pending = new Map<
		number,
		{
			resolve: (message: JsonRpcMessage) => void;
			reject: (error: Error) => void;
			timeout: ReturnType<typeof setTimeout>;
		}
	>();
	#threadId: string | null = null;

	constructor(config: SymphonyConfig, cwd: string) {
		this.#config = config;
		this.#cwd = cwd;
	}

	async start(): Promise<void> {
		const launch = codexLaunchCommand(this.#config);
		const child = spawn(launch.command, launch.args, {
			cwd: this.#cwd,
			stdio: ["pipe", "pipe", "pipe"],
		});
		this.#child = child;
		const lines = createInterface({ input: child.stdout });
		lines.on("line", (line) => this.#onLine(line));
		child.stderr.on("data", () => {
			// Keep diagnostic stderr separate from JSONL stdout and prevent backpressure.
		});
		child.on("exit", (code) => {
			for (const pending of this.#pending.values()) {
				clearTimeout(pending.timeout);
				pending.reject(new Error(`Codex app-server exited with code ${code}`));
			}
			this.#pending.clear();
		});
		child.on("error", (error) => {
			for (const pending of this.#pending.values()) {
				clearTimeout(pending.timeout);
				pending.reject(error);
			}
			this.#pending.clear();
		});
		await this.#request("initialize", {
			clientInfo: {
				name: "openagentlayer_symphony",
				title: "OpenAgentLayer Symphony",
				version: "0.0.0",
			},
			capabilities: { experimentalApi: true },
		});
		this.#notify("initialized");
		const thread = await this.#request("thread/start", {
			cwd: this.#cwd,
			approvalPolicy: this.#config.codex.approval_policy,
			sandbox: this.#config.codex.thread_sandbox,
			ephemeral: true,
			serviceName: "openagentlayer-symphony",
			dynamicTools: [linearGraphqlToolSpec()],
		});
		this.#threadId = readNestedString(thread, ["thread", "id"]);
		if (!this.#threadId)
			throw new Error("Codex thread/start missing thread.id");
	}

	async runTurn(input: string): Promise<TurnRunSummary> {
		if (!this.#threadId) throw new Error("Codex thread is not initialized");
		const completed = this.#waitForTurn(null);
		await this.#request("turn/start", {
			threadId: this.#threadId,
			input: [{ type: "text", text: input, textElements: [] }],
			cwd: this.#cwd,
			sandboxPolicy: this.#config.codex.turn_sandbox_policy,
			approvalPolicy: this.#config.codex.approval_policy,
		});
		return await completed;
	}

	stop(): void {
		if (!this.#child) return;
		this.#child.kill("SIGTERM");
		this.#child = null;
	}

	async #waitForTurn(turnId: string | null): Promise<TurnRunSummary> {
		return await new Promise<TurnRunSummary>((resolvePromise, reject) => {
			const timeout = setTimeout(() => {
				this.#child?.kill("SIGTERM");
				reject(
					new Error(
						`Codex turn timed out after ${this.#config.codex.turn_timeout_ms}ms`,
					),
				);
			}, this.#config.codex.turn_timeout_ms);
			const onMessage = (message: JsonRpcMessage) => {
				if (message.method !== "turn/completed") return;
				const params = message.params ?? {};
				const completedTurnId = readNestedString(params, ["turn", "id"]);
				if (turnId && completedTurnId && turnId !== completedTurnId) return;
				this.#messageListeners.delete(onMessage);
				clearTimeout(timeout);
				const status = readNestedString(params, ["turn", "status"]);
				const error = readNestedString(params, ["turn", "error", "message"]);
				const threadId = readNestedString(params, ["threadId"]);
				const resolvedTurnId = completedTurnId ?? turnId;
				const summary: TurnRunSummary = {
					status: status === "completed" ? "succeeded" : "failed",
				};
				if (error !== null) summary.error = error;
				if (threadId !== null) summary.threadId = threadId;
				if (resolvedTurnId !== null) summary.turnId = resolvedTurnId;
				if (threadId !== null && resolvedTurnId !== null)
					summary.sessionId = `${threadId}-${resolvedTurnId}`;
				const inCount = readToken(params, "input");
				const outCount = readToken(params, "output");
				const allCount = readToken(params, "total");
				if (inCount !== undefined) summary.inputTokens = inCount;
				if (outCount !== undefined) summary.outputTokens = outCount;
				if (allCount !== undefined) summary.totalTokens = allCount;
				if (params["rateLimits"] !== undefined)
					summary.rateLimits = params["rateLimits"];
				resolvePromise(summary);
			};
			this.#messageListeners.add(onMessage);
		});
	}

	readonly #messageListeners = new Set<(message: JsonRpcMessage) => void>();

	#request(
		method: string,
		params: Record<string, unknown>,
	): Promise<JsonRpcMessage> {
		const id = this.#nextId++;
		this.#send({ id, method, params: compactObject(params) });
		return new Promise((resolvePromise, reject) => {
			const timeout = setTimeout(() => {
				this.#pending.delete(id);
				reject(
					new Error(
						`Codex app-server request ${method} timed out after ${this.#config.codex.read_timeout_ms}ms`,
					),
				);
			}, this.#config.codex.read_timeout_ms);
			this.#pending.set(id, { resolve: resolvePromise, reject, timeout });
		});
	}

	#notify(method: string): void {
		this.#send({ method });
	}

	#send(message: JsonRpcMessage): void {
		const stdin = this.#child?.stdin;
		if (!stdin?.writable)
			throw new Error("Codex app-server stdin is not writable");
		stdin.write(`${JSON.stringify(message)}\n`);
	}

	#onLine(line: string): void {
		let message: JsonRpcMessage;
		try {
			message = JSON.parse(line) as JsonRpcMessage;
		} catch {
			return;
		}
		if (message.id !== undefined) {
			const pending = this.#pending.get(Number(message.id));
			if (pending) {
				this.#pending.delete(Number(message.id));
				clearTimeout(pending.timeout);
				if (message.error)
					pending.reject(new Error(message.error.message ?? "Codex error"));
				else
					pending.resolve(
						(message.response ?? message.result) as JsonRpcMessage,
					);
			} else if (message.method) {
				this.#handleServerRequest(message).catch((error) => {
					this.#sendToolResult(message, failedToolResult(String(error)));
				});
			}
		}
		for (const listener of this.#messageListeners) listener(message);
	}

	async #handleServerRequest(message: JsonRpcMessage): Promise<void> {
		if (message.method !== "item/tool/call") {
			this.#sendUnsupportedRequest(message);
			return;
		}
		const tool = readNestedString(message.params, ["tool"]);
		if (tool !== "linear_graphql") {
			this.#sendToolResult(message, {
				contentItems: [
					{
						type: "inputText",
						text: `Unsupported Symphony app-server tool: ${tool ?? "<missing>"}`,
					},
				],
				success: false,
			});
			return;
		}
		const result = await this.#runLinearGraphql(message.params?.["arguments"]);
		this.#sendToolResult(message, result);
	}

	async #runLinearGraphql(argumentsValue: unknown): Promise<{
		contentItems: Array<{ type: "inputText"; text: string }>;
		success: boolean;
	}> {
		try {
			const args = asRecord(argumentsValue);
			const query = typeof args["query"] === "string" ? args["query"] : "";
			if (query.trim().length === 0)
				return failedToolResult("linear_graphql requires a non-empty query");
			const variables =
				args["variables"] === undefined ? {} : asRecord(args["variables"]);
			const response = await fetch(this.#config.tracker.endpoint, {
				method: "POST",
				headers: {
					authorization: this.#config.tracker.api_key,
					"content-type": "application/json",
				},
				body: JSON.stringify({ query, variables }),
			});
			const body = await response.text();
			if (!response.ok)
				return failedToolResult(
					`Linear GraphQL request failed with status ${response.status}: ${body}`,
				);
			const parsed = JSON.parse(body) as Record<string, unknown>;
			return {
				contentItems: [{ type: "inputText", text: JSON.stringify(parsed) }],
				success: !(
					Array.isArray(parsed["errors"]) && parsed["errors"].length > 0
				),
			};
		} catch (error) {
			return failedToolResult(String(error));
		}
	}

	#sendToolResult(
		message: JsonRpcMessage,
		result: {
			contentItems: Array<{ type: "inputText"; text: string }>;
			success: boolean;
		},
	): void {
		if (message.id === undefined) return;
		this.#send({ id: message.id, result });
	}

	#sendUnsupportedRequest(message: JsonRpcMessage): void {
		if (message.id === undefined) return;
		this.#send({
			id: message.id,
			error: {
				message: `Unsupported Symphony app-server request: ${message.method ?? "<missing>"}`,
			},
		});
	}
}

function linearGraphqlToolSpec(): Record<string, unknown> {
	return {
		name: "linear_graphql",
		description:
			"Run a raw Linear GraphQL query or mutation with Symphony's configured Linear authentication.",
		inputSchema: {
			type: "object",
			additionalProperties: false,
			required: ["query"],
			properties: {
				query: { type: "string" },
				variables: { type: "object", additionalProperties: true },
			},
		},
		deferLoading: false,
	};
}

function failedToolResult(message: string): {
	contentItems: Array<{ type: "inputText"; text: string }>;
	success: false;
} {
	return {
		contentItems: [{ type: "inputText", text: message }],
		success: false,
	};
}

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value))
		return value as Record<string, unknown>;
	throw new Error("Expected object");
}

function compactObject(
	value: Record<string, unknown>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) => entry !== undefined),
	);
}

function readNestedString(value: unknown, path: string[]): string | null {
	let current = value;
	for (const key of path) {
		if (!current || typeof current !== "object") return null;
		current = (current as Record<string, unknown>)[key];
	}
	return typeof current === "string" ? current : null;
}

function readToken(
	value: unknown,
	name: "input" | "output" | "total",
): number | undefined {
	const direct = readNestedNumber(value, ["usage", `${name}Tokens`]);
	return direct ?? readNestedNumber(value, ["turn", "usage", `${name}Tokens`]);
}

function readNestedNumber(value: unknown, path: string[]): number | undefined {
	let current = value;
	for (const key of path) {
		if (!current || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return typeof current === "number" ? current : undefined;
}
