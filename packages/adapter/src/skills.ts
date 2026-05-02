import type { Artifact } from "@openagentlayer/artifact";
import type { OalSource, Provider, SkillRecord } from "@openagentlayer/source";
import { skillMarkdown } from "./common";

export function renderSkillArtifacts(
	provider: Provider,
	skill: SkillRecord,
	rootPath: string,
	source: OalSource,
): Artifact[] {
	const artifacts: Artifact[] = [
		{
			provider,
			path: `${rootPath}/${skill.id}/SKILL.md`,
			content: skill.upstream?.verbatim
				? skill.body
				: skillMarkdown(skill, source),
			sourceId: `skill:${skill.id}`,
			mode: "file",
		},
	];
	for (const file of skill.supportFiles ?? [])
		artifacts.push({
			provider,
			path: `${rootPath}/${skill.id}/${file.path}`,
			content: requireSupportFileContent(skill, file.path, file.content),
			sourceId: `skill:${skill.id}:${file.path}`,
			executable: file.executable === true,
			mode: "file",
		});
	return artifacts;
}

function requireSupportFileContent(
	skill: SkillRecord,
	path: string,
	content: string | undefined,
): string {
	if (content) return content;
	throw new Error(`skill ${skill.id} support file ${path} was not hydrated.`);
}
