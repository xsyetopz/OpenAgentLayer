use crate::events::{Event, EventKind};
use crate::types::{
    Agent, AgentStatus, Artifact, ArtifactKind, InboxEntry, Message, Project, WorkerRole,
};

pub(crate) fn projects_json(projects: &[Project]) -> String {
    let body = projects
        .iter()
        .map(project_json)
        .collect::<Vec<_>>()
        .join(",");
    format!("{{\"projects\":[{body}]}}")
}

pub(crate) fn events_json(events: &[Event]) -> String {
    let body = events.iter().map(event_json).collect::<Vec<_>>().join(",");
    format!("{{\"events\":[{body}]}}")
}

pub(crate) fn snapshot_json(projects: &[Project]) -> String {
    format!(
        "{{\"schema\":\"opendex.snapshot.v1\",\"state\":{}}}",
        projects_json(projects)
    )
}

pub(crate) fn event_json(event: &Event) -> String {
    format!(
        "{{\"id\":\"{}\",\"project_id\":\"{}\",\"kind\":\"{}\",\"thread_id\":{},\"agent_id\":{},\"message\":{},\"created_at_ms\":{}}}",
        escape(&event.id),
        escape(&event.project_id),
        event_kind(&event.kind),
        optional_string(&event.thread_id),
        optional_string(&event.agent_id),
        optional_string(&event.message),
        event.created_at_ms
    )
}

fn project_json(project: &Project) -> String {
    let agents = project
        .agents
        .iter()
        .map(agent_json)
        .collect::<Vec<_>>()
        .join(",");
    let inbox = project
        .inbox
        .iter()
        .map(inbox_json)
        .collect::<Vec<_>>()
        .join(",");
    let events = project
        .events
        .iter()
        .map(event_json)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "{{\"id\":\"{}\",\"name\":\"{}\",\"root\":\"{}\",\"orchestrator_thread_id\":{},\"agents\":[{}],\"inbox\":[{}],\"events\":[{}],\"created_at_ms\":{}}}",
        escape(&project.id),
        escape(&project.name),
        escape(&project.root),
        optional_string(&project.orchestrator_thread_id),
        agents,
        inbox,
        events,
        project.created_at_ms
    )
}

fn agent_json(agent: &Agent) -> String {
    let artifacts = agent
        .artifacts
        .iter()
        .map(artifact_json)
        .collect::<Vec<_>>()
        .join(",");
    let messages = agent
        .messages
        .iter()
        .map(message_json)
        .collect::<Vec<_>>()
        .join(",");
    let owned_paths = strings_json(&agent.owned_paths);
    let expected_evidence = strings_json(&agent.expected_evidence);
    format!(
        "{{\"id\":\"{}\",\"project_id\":\"{}\",\"role\":\"{}\",\"thread_id\":\"{}\",\"parent_thread_id\":\"{}\",\"display_name\":\"{}\",\"task\":\"{}\",\"status\":\"{}\",\"owned_paths\":{},\"expected_evidence\":{},\"artifacts\":[{}],\"messages\":[{}],\"created_at_ms\":{},\"archived_at_ms\":{}}}",
        escape(&agent.id),
        escape(&agent.project_id),
        worker_role(&agent.role),
        escape(&agent.thread_id),
        escape(&agent.parent_thread_id),
        escape(&agent.display_name),
        escape(&agent.task),
        agent_status(&agent.status),
        owned_paths,
        expected_evidence,
        artifacts,
        messages,
        agent.created_at_ms,
        optional_u128(agent.archived_at_ms)
    )
}

fn artifact_json(artifact: &Artifact) -> String {
    format!(
        "{{\"id\":\"{}\",\"project_id\":\"{}\",\"thread_id\":\"{}\",\"kind\":\"{}\",\"path\":{},\"title\":{},\"description\":{},\"created_at_ms\":{}}}",
        escape(&artifact.id),
        escape(&artifact.project_id),
        escape(&artifact.thread_id),
        artifact_kind(&artifact.kind),
        optional_string(&artifact.path),
        optional_string(&artifact.title),
        optional_string(&artifact.description),
        artifact.created_at_ms
    )
}

fn message_json(message: &Message) -> String {
    format!(
        "{{\"id\":\"{}\",\"thread_id\":\"{}\",\"text\":\"{}\",\"final_message\":{},\"artifact_ids\":{},\"created_at_ms\":{}}}",
        escape(&message.id),
        escape(&message.thread_id),
        escape(&message.text),
        message.final_message,
        strings_json(&message.artifact_ids),
        message.created_at_ms
    )
}

fn inbox_json(entry: &InboxEntry) -> String {
    format!(
        "{{\"id\":\"{}\",\"project_id\":\"{}\",\"orchestrator_thread_id\":\"{}\",\"worker_thread_id\":\"{}\",\"agent_id\":\"{}\",\"message_id\":\"{}\",\"artifact_ids\":{},\"created_at_ms\":{}}}",
        escape(&entry.id),
        escape(&entry.project_id),
        escape(&entry.orchestrator_thread_id),
        escape(&entry.worker_thread_id),
        escape(&entry.agent_id),
        escape(&entry.message_id),
        strings_json(&entry.artifact_ids),
        entry.created_at_ms
    )
}

fn strings_json(values: &[String]) -> String {
    let values = values
        .iter()
        .map(|value| format!("\"{}\"", escape(value)))
        .collect::<Vec<_>>()
        .join(",");
    format!("[{values}]")
}

fn optional_string(value: &Option<String>) -> String {
    value
        .as_ref()
        .map(|value| format!("\"{}\"", escape(value)))
        .unwrap_or_else(|| "null".to_string())
}

fn optional_u128(value: Option<u128>) -> String {
    value
        .map(|value| value.to_string())
        .unwrap_or_else(|| "null".to_string())
}

fn worker_role(role: &WorkerRole) -> &'static str {
    match role {
        WorkerRole::Worker => "Worker",
        WorkerRole::Qa => "Qa",
    }
}

fn agent_status(status: &AgentStatus) -> &'static str {
    match status {
        AgentStatus::Running => "Running",
        AgentStatus::Waiting => "Waiting",
        AgentStatus::Approved => "Approved",
        AgentStatus::Blocked => "Blocked",
        AgentStatus::Archived => "Archived",
    }
}

fn artifact_kind(kind: &ArtifactKind) -> &'static str {
    match kind {
        ArtifactKind::Handoff => "Handoff",
        ArtifactKind::Diff => "Diff",
        ArtifactKind::Screenshot => "Screenshot",
        ArtifactKind::Image => "Image",
        ArtifactKind::ReferenceDesign => "ReferenceDesign",
        ArtifactKind::Golden => "Golden",
        ArtifactKind::Log => "Log",
    }
}

fn event_kind(kind: &EventKind) -> &'static str {
    match kind {
        EventKind::ProjectRegistered => "ProjectRegistered",
        EventKind::OrchestratorAttached => "OrchestratorAttached",
        EventKind::AgentSpawned => "AgentSpawned",
        EventKind::MessageRecorded => "MessageRecorded",
        EventKind::ArtifactRecorded => "ArtifactRecorded",
        EventKind::WorkerRouted => "WorkerRouted",
        EventKind::ContinuationDecided => "ContinuationDecided",
        EventKind::AgentArchived => "AgentArchived",
        EventKind::UsageRecorded => "UsageRecorded",
        EventKind::ApprovalRequested => "ApprovalRequested",
        EventKind::ApprovalResolved => "ApprovalResolved",
        EventKind::LiveProcessRegistered => "LiveProcessRegistered",
        EventKind::LiveProcessCompleted => "LiveProcessCompleted",
    }
}

fn escape(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        match character {
            '"' => escaped.push_str("\\\""),
            '\\' => escaped.push_str("\\\\"),
            '\n' => escaped.push_str("\\n"),
            '\r' => escaped.push_str("\\r"),
            '\t' => escaped.push_str("\\t"),
            value if value.is_control() => {
                escaped.push_str(&format!("\\u{:04x}", value as u32));
            }
            value => escaped.push(value),
        }
    }
    escaped
}
