import type { AdapterArtifact } from "@openagentlayer/adapter-contract";
import type { CommandRecord, Surface } from "@openagentlayer/types";

export function renderCommandSupportArtifacts(
	record: CommandRecord,
	surface: Surface,
	commandRoot: string,
): readonly AdapterArtifact[] {
	return record.support_files.map((file) => ({
		content: file.content,
		kind: "command",
		path: `${commandRoot}/${file.path}`,
		sourceRecordIds: [record.id],
		surface,
	}));
}

export function renderCommandMetadata(record: CommandRecord): string {
	return [
		"",
		"## OpenAgentLayer Route Metadata",
		"",
		`- Owner role: ${record.owner_role}`,
		`- Route contract: ${record.route_contract ?? "none"}`,
		`- Side-effect level: ${record.side_effect_level ?? "unspecified"}`,
		`- Required skills: ${record.required_skills.join(", ") || "none"}`,
		`- Hook policies: ${record.hook_policies.join(", ") || "none"}`,
		`- Arguments: ${record.arguments.join(", ") || "none"}`,
		record.examples.length === 0 ? "" : renderCommandExamples(record),
		"",
	].join("\n");
}

function renderCommandExamples(record: CommandRecord): string {
	return [
		"",
		"## Examples",
		"",
		...record.examples.flatMap((example) => [
			`- ${example.title}: \`${example.invocation}\``,
			example.notes === undefined ? "" : `  - ${example.notes}`,
		]),
	].join("\n");
}
