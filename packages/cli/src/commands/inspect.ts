import { renderAllProviders } from "@openagentlayer/adapter";
import { type InspectTopic, inspectTopic } from "@openagentlayer/inspect";
import { loadSource } from "@openagentlayer/source";

const TOPICS = new Set<InspectTopic>([
	"capabilities",
	"manifest",
	"generated-diff",
	"rtk-report",
	"command-policy",
	"release-witness",
]);

export async function runInspectCommand(
	repoRoot: string,
	args: string[] = [],
): Promise<void> {
	const topic = inspectTopicArg(args[0] ?? "capabilities");
	const graph = await loadSource(`${repoRoot}/source`);
	const rendered = await renderAllProviders(graph.source, repoRoot);
	console.log(
		await inspectTopic(topic, {
			repoRoot,
			source: graph.source,
			artifacts: rendered.artifacts,
			unsupported: rendered.unsupported,
		}),
	);
}

function inspectTopicArg(value: string): InspectTopic {
	if (TOPICS.has(value as InspectTopic)) return value as InspectTopic;
	throw new Error(
		`Unsupported inspect topic \`${value}\`. Use capabilities, manifest, generated-diff, rtk-report, command-policy, or release-witness.`,
	);
}
