import { createInterface } from "node:readline";

type McpServer = "anthropic-docs" | "opencode-docs";

interface JsonRpcRequest {
	id?: string | number;
	method?: string;
	params?: Record<string, unknown>;
}

const MCP_SERVERS = {
	"anthropic-docs": {
		name: "oal-anthropic-docs",
		title: "Anthropic Docs",
		skill: "anthropic-docs",
		description:
			"Use OAL Anthropic Docs skill guidance for Anthropic API and Claude Code docs.",
		references: [
			["Anthropic platform docs", "https://platform.claude.com/docs/en/home"],
			["Claude Code docs", "https://code.claude.com/docs/"],
			["Claude Code settings", "https://code.claude.com/docs/en/settings"],
			["Claude Code hooks", "https://code.claude.com/docs/en/hooks"],
			["Claude Code skills", "https://code.claude.com/docs/en/skills"],
			[
				"Claude Code plugins",
				"https://code.claude.com/docs/en/plugins-reference",
			],
		],
	},
	"opencode-docs": {
		name: "oal-opencode-docs",
		title: "OpenCode Docs",
		skill: "opencode-docs",
		description:
			"Use OAL OpenCode Docs skill guidance for OpenCode config, tools, plugins, agents, permissions, and MCP.",
		references: [
			["OpenCode docs", "https://opencode.ai/docs/"],
			["OpenCode config schema", "https://opencode.ai/config.json"],
			["OpenCode config", "https://opencode.ai/docs/config/"],
			["OpenCode plugins", "https://opencode.ai/docs/plugins/"],
			["OpenCode tools", "https://opencode.ai/docs/tools/"],
			["OpenCode custom tools", "https://opencode.ai/docs/custom-tools/"],
			["OpenCode agents", "https://opencode.ai/docs/agents/"],
		],
	},
} as const;

export async function runMcpCommand(args: string[]): Promise<void> {
	const action = args[0];
	if (action !== "serve") throw new Error("Expected MCP action: serve.");
	const server = mcpServer(args[1]);
	if (!server)
		throw new Error("Expected MCP server: anthropic-docs or opencode-docs.");
	await runMcpServer(server);
}

async function runMcpServer(server: McpServer): Promise<void> {
	const lines = createInterface({ input: process.stdin });
	for await (const line of lines) handleLine(server, line);
}

function handleLine(server: McpServer, line: string): void {
	const trimmed = line.trim();
	if (!trimmed) return;
	const request = JSON.parse(trimmed) as JsonRpcRequest;
	const response = handleRequest(server, request);
	if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
}

function handleRequest(server: McpServer, request: JsonRpcRequest): unknown {
	const docs = MCP_SERVERS[server];
	if (request.method === "initialize")
		return {
			jsonrpc: "2.0",
			id: request.id,
			result: {
				protocolVersion: "2024-11-05",
				capabilities: { tools: {} },
				serverInfo: { name: docs.name, version: "1" },
			},
		};
	if (request.method === "tools/list")
		return {
			jsonrpc: "2.0",
			id: request.id,
			result: {
				tools: [
					{
						name: "search_docs",
						description: docs.description,
						inputSchema: {
							type: "object",
							properties: {
								query: {
									type: "string",
									description:
										"Question or topic to match against OAL docs references.",
								},
							},
						},
					},
					{
						name: "list_docs",
						description: `List ${docs.title} URLs and OAL skill instructions.`,
						inputSchema: { type: "object", properties: {} },
					},
				],
			},
		};
	if (request.method === "tools/call") return toolCall(server, request);
	return {
		jsonrpc: "2.0",
		id: request.id,
		error: { code: -32601, message: "Method not found" },
	};
}

function toolCall(server: McpServer, request: JsonRpcRequest): unknown {
	const toolName = String(request.params?.["name"] ?? "");
	if (toolName !== "search_docs" && toolName !== "list_docs")
		return {
			jsonrpc: "2.0",
			id: request.id,
			error: { code: -32602, message: "Unknown docs tool" },
		};
	const query = String(
		(request.params?.["arguments"] as Record<string, unknown> | undefined)?.[
			"query"
		] ?? "",
	);
	return {
		jsonrpc: "2.0",
		id: request.id,
		result: {
			content: [{ type: "text", text: docsText(server, query) }],
		},
	};
}

function docsText(server: McpServer, query: string): string {
	const docs = MCP_SERVERS[server];
	return [
		`${docs.title} via OAL skill ${docs.skill}`,
		docs.description,
		query ? `Query: ${query}` : "",
		"References:",
		...docs.references.map(([label, url]) => `- ${label}: ${url}`),
		"Use these references as source truth before provider behavior changes.",
	]
		.filter(Boolean)
		.join("\n");
}

function mcpServer(value: string | undefined): McpServer | undefined {
	if (value === "anthropic-docs" || value === "opencode-docs") return value;
	return undefined;
}
