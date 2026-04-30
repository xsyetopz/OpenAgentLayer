import type {
	AgentMode,
	EffortLevel,
	ModelId,
	PolicyCategory,
	PolicyFailureMode,
	PolicyHandlerClass,
	SourceRecordKind,
	Surface,
	UnknownMap,
} from "./primitives";

export interface SourceLocation {
	readonly directory: string;
	readonly metadataPath: string;
	readonly bodyPath: string | undefined;
}

export interface BaseRecord {
	readonly id: string;
	readonly kind: SourceRecordKind;
	readonly title: string;
	readonly description: string;
	readonly surfaces: readonly Surface[];
	readonly location: SourceLocation;
	readonly raw: UnknownMap;
}

export interface AgentRecord extends BaseRecord {
	readonly kind: "agent";
	readonly role: string;
	readonly prompt: string;
	readonly prompt_content: string;
	readonly mode: AgentMode;
	readonly route_contract: string | undefined;
	readonly model_intent: string | undefined;
	readonly family: string | undefined;
	readonly primary: boolean | undefined;
	readonly subagent: boolean | undefined;
	readonly model_class: string | undefined;
	readonly effort_ceiling: EffortLevel | undefined;
	readonly budget_tier: string | undefined;
	readonly handoff_contract: string | undefined;
	readonly permissions: readonly string[];
	readonly skills: readonly string[];
}

export interface SkillRecord extends BaseRecord {
	readonly kind: "skill";
	readonly triggers: readonly string[];
	readonly body: string;
	readonly body_content: string;
	readonly upstream: SkillUpstreamSource | undefined;
	readonly license: string | undefined;
	readonly compatibility: string | undefined;
	readonly metadata: UnknownMap;
	readonly allowed_tools: readonly string[];
	readonly references: readonly string[];
	readonly scripts: readonly string[];
	readonly assets: readonly string[];
	readonly support_files: readonly SkillSupportFile[];
	readonly when_to_use: string | undefined;
	readonly invocation_mode: string | undefined;
	readonly user_invocable: boolean | undefined;
	readonly tool_grants: readonly string[];
	readonly route_contract: string | undefined;
	readonly model_policy: ModelId | undefined;
	readonly supporting_files: readonly string[];
}

export interface SkillUpstreamSource {
	readonly body: string;
	readonly package: string | undefined;
	readonly repository: string | undefined;
	readonly commit: string | undefined;
	readonly support_files: readonly SkillUpstreamSupportFile[];
}

export interface SkillUpstreamSupportFile {
	readonly source: string;
	readonly target: string;
	readonly category: SkillSupportFile["category"];
}

export interface SkillSupportFile {
	readonly path: string;
	readonly content: string;
	readonly category: "reference" | "script" | "asset" | "supporting-file";
}

export interface CommandRecord extends BaseRecord {
	readonly kind: "command";
	readonly owner_role: string;
	readonly route_contract: string | undefined;
	readonly aliases: readonly string[];
	readonly prompt_template: string;
	readonly prompt_template_content: string;
	readonly arguments: readonly string[];
	readonly argument_schema: UnknownMap;
	readonly invocation: string | undefined;
	readonly side_effect_level: string | undefined;
	readonly surface_overrides: UnknownMap;
	readonly model_policy: ModelId | undefined;
	readonly hook_policies: readonly string[];
	readonly required_skills: readonly string[];
	readonly examples: readonly CommandExample[];
	readonly support_files: readonly CommandSupportFile[];
	readonly supporting_files: readonly string[];
}

export interface CommandExample {
	readonly title: string;
	readonly invocation: string;
	readonly notes: string | undefined;
}

export interface CommandSupportFile {
	readonly path: string;
	readonly content: string;
}

export interface PolicyRecord extends BaseRecord {
	readonly kind: "policy";
	readonly category: PolicyCategory;
	readonly severity: string;
	readonly event_intent: string;
	readonly runtime_script: string | undefined;
	readonly surface_mappings: UnknownMap;
	readonly blocking: boolean | undefined;
	readonly failure_mode: PolicyFailureMode | undefined;
	readonly handler_class: PolicyHandlerClass | undefined;
	readonly matcher: string | undefined;
	readonly payload_schema: string | undefined;
	readonly surface_events: readonly string[];
	readonly test_payloads: readonly string[];
	readonly message: string | undefined;
	readonly tests: readonly string[];
}

export interface GuidanceRecord extends BaseRecord {
	readonly kind: "guidance";
	readonly authority: string;
	readonly body: string;
	readonly body_content: string;
	readonly injection_point: string;
}

export interface ModelPlanAssignment {
	readonly role: string;
	readonly model: ModelId;
	readonly effort: EffortLevel;
}

export interface ModelPlanOverride {
	readonly role: string;
	readonly route: string;
	readonly model: ModelId;
	readonly effort: EffortLevel;
}

export interface ModelPlanRecord extends BaseRecord {
	readonly kind: "model-plan";
	readonly default_plan: boolean | undefined;
	readonly default_model: ModelId;
	readonly implementation_effort: EffortLevel;
	readonly plan_effort: EffortLevel;
	readonly review_effort: EffortLevel;
	readonly effort_ceiling: EffortLevel;
	readonly role_assignments: readonly ModelPlanAssignment[];
	readonly deep_route_overrides: readonly ModelPlanOverride[];
	readonly long_context_routes: readonly string[];
}

export interface ConfigReplacement {
	readonly from: string;
	readonly to: string;
	readonly reason: string;
	readonly source_url: string;
}

export interface DefaultProfile {
	readonly profile_id: string;
	readonly placement: string;
	readonly emitted_key_paths: readonly string[];
	readonly source_url: string;
	readonly validation: string;
}

export interface SurfaceConfigRecord extends BaseRecord {
	readonly kind: "surface-config";
	readonly surface: Surface;
	readonly allowed_key_paths: readonly string[];
	readonly do_not_emit_key_paths: readonly string[];
	readonly project_defaults: UnknownMap;
	readonly default_profile: DefaultProfile;
	readonly replacements: readonly ConfigReplacement[];
	readonly validation_rules: readonly string[];
}

export type SourceRecord =
	| AgentRecord
	| SkillRecord
	| CommandRecord
	| PolicyRecord
	| GuidanceRecord
	| ModelPlanRecord
	| SurfaceConfigRecord;
