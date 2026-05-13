import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { renderAllProviders } from "@openagentlayer/adapter";
import { type InspectTopic, inspectTopic } from "@openagentlayer/inspect";
import { loadSource } from "@openagentlayer/source";
import { option } from "../arguments";

type McpServer = "oal-inspect";
type McpAction = "serve" | "install" | "remove";

interface JsonRpcRequest {
	id?: string | number;
	method?: string;
	params?: Record<string, unknown>;
}

const MCP_SERVERS = {
	"oal-inspect": {
		name: "oal-inspect",
		title: "OAL Inspect",
		skill: "oal",
		description:
			"Inspect rendered OAL capabilities, manifest ownership, generated source inputs, command policy, RTK reporting guidance, and release witness data",
		references: [
			["OAL capability report", "oal inspect capabilities"],
			["OAL manifest report", "oal inspect manifest"],
			["OAL release witness", "oal inspect release-witness"],
		],
	},
} as const;

export async function runMcpCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const action = mcpAction(args[0]);
	if (!action)
		throw new Error("Expected MCP action: serve, install, or remove");
	const server = mcpServer(args[1]);
	if (!server) throw new Error("Expected MCP server: oal-inspect");
	if (action === "serve") await runMcpServer(repoRoot, server);
	else await configureMcpServer(action, server, args.slice(2));
}

async function runMcpServer(
	repoRoot: string,
	server: McpServer,
): Promise<void> {
	const lines = createInterface({ input: process.stdin });
	for await (const line of lines) await handleLine(repoRoot, server, line);
}

async function handleLine(
	repoRoot: string,
	server: McpServer,
	line: string,
): Promise<void> {
	const trimmed = line.trim();
	if (!trimmed) return;
	const request = JSON.parse(trimmed) as JsonRpcRequest;
	const response = await handleRequest(repoRoot, server, request);
	if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
}

async function handleRequest(
	repoRoot: string,
	server: McpServer,
	request: JsonRpcRequest,
): Promise<unknown> {
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
				tools: inspectTools(),
			},
		};
	if (request.method === "tools/call")
		return await toolCall(repoRoot, server, request);
	return {
		jsonrpc: "2.0",
		id: request.id,
		error: { code: -32601, message: "Method not found" },
	};
}

async function toolCall(
	repoRoot: string,
	server: McpServer,
	request: JsonRpcRequest,
): Promise<unknown> {
	const toolName = String(request.params?.["name"] ?? "");
	if (server === "oal-inspect") {
		const topic = inspectTopicName(toolName);
		if (!topic)
			return {
				jsonrpc: "2.0",
				id: request.id,
				error: { code: -32602, message: "Unknown OAL inspect tool" },
			};
		return {
			jsonrpc: "2.0",
			id: request.id,
			result: {
				content: [{ type: "text", text: await inspectText(repoRoot, topic) }],
			},
		};
	}
	return {
		jsonrpc: "2.0",
		id: request.id,
		error: { code: -32602, message: "Unknown OAL inspect tool" },
	};
}

function inspectTools(): unknown[] {
	return [
		["capabilities", "Report rendered provider capabilities and gaps."],
		["manifest", "Report manifest ownership by provider."],
		["generated_diff", "Report generated artifact source inputs."],
		["rtk_report", "Return RTK report command guidance."],
		["command_policy", "Return command policy inspection guidance."],
		["release_witness", "Return deterministic release witness JSON."],
	].map(([name, description]) => ({
		name,
		description,
		inputSchema: { type: "object", properties: {} },
	}));
}

async function inspectText(
	repoRoot: string,
	topic: InspectTopic,
): Promise<string> {
	const graph = await loadSource(join(repoRoot, "source"));
	const rendered = await renderAllProviders(graph.source, repoRoot);
	return await inspectTopic(topic, {
		repoRoot,
		source: graph.source,
		artifacts: rendered.artifacts,
		unsupported: rendered.unsupported,
	});
}

function inspectTopicName(name: string): InspectTopic | undefined {
	if (name === "generated_diff") return "generated-diff";
	if (name === "rtk_report") return "rtk-report";
	if (name === "command_policy") return "command-policy";
	if (name === "release_witness") return "release-witness";
	if (name === "capabilities" || name === "manifest") return name;
	return undefined;
}

function mcpServer(value: string | undefined): McpServer | undefined {
	if (value === "oal-inspect") return value;
	return undefined;
}

function mcpAction(value: string | undefined): McpAction | undefined {
	if (value === "serve" || value === "install" || value === "remove")
		return value;
	return undefined;
}

async function configureMcpServer(
	action: "install" | "remove",
	server: McpServer,
	args: string[],
): Promise<void> {
	const provider = option(args, "--provider") ?? "opencode";
	if (provider !== "opencode")
		throw new Error("Only `--provider opencode` is supported for MCP config");
	const scope = option(args, "--scope") === "project" ? "project" : "global";
	const configPath =
		scope === "global"
			? join(
					resolve(option(args, "--home") ?? homedir()),
					".config/opencode/opencode.json",
				)
			: join(
					resolve(option(args, "--target") ?? process.cwd()),
					"opencode.jsonc",
				);
	await writeOpenCodeMcpConfig(configPath, action, server);
	console.log(`OpenCode MCP ${action}: ${configPath}`);
}

async function writeOpenCodeMcpConfig(
	configPath: string,
	action: "install" | "remove",
	server: McpServer,
): Promise<void> {
	const config = await readJsonConfig(configPath);
	const mcp = isRecord(config["mcp"]) ? { ...config["mcp"] } : {};
	const docs = MCP_SERVERS[server];
	if (action === "install") {
		mcp[docs.name] = {
			type: "local",
			command: ["oal", "mcp", "serve", server],
			enabled: true,
		};
	} else {
		delete mcp[docs.name];
	}
	config["mcp"] = mcp;
	await mkdir(dirname(configPath), { recursive: true });
	await writeFile(configPath, `${JSON.stringify(config, undefined, 2)}\n`);
}

async function readJsonConfig(
	configPath: string,
): Promise<Record<string, unknown>> {
	try {
		const text = await readFile(configPath, "utf8");
		const parsed = JSON.parse(stripJsonComments(text)) as unknown;
		return isRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
