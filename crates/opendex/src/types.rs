use crate::events::Event;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum WorkerRole {
    Worker,
    Qa,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum AgentStatus {
    Running,
    Waiting,
    Approved,
    Blocked,
    Archived,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum ArtifactKind {
    Handoff,
    Diff,
    Screenshot,
    Image,
    ReferenceDesign,
    Golden,
    Log,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum DecisionKind {
    Continue,
    Approved,
    Blocked,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ProjectInput {
    pub id: Option<String>,
    pub name: String,
    pub root: String,
    pub orchestrator_thread_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct SpawnInput {
    pub role: WorkerRole,
    pub task: String,
    pub display_name: Option<String>,
    pub thread_id: Option<String>,
    pub owned_paths: Vec<String>,
    pub expected_evidence: Vec<String>,
    pub parent_thread_id: Option<String>,
    pub depth: u32,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ArtifactInput {
    pub kind: ArtifactKind,
    pub path: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct MessageInput {
    pub text: String,
    pub final_message: bool,
    pub artifact_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct DecisionInput {
    pub kind: DecisionKind,
    pub note: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub root: String,
    pub orchestrator_thread_id: Option<String>,
    pub agents: Vec<Agent>,
    pub inbox: Vec<InboxEntry>,
    pub events: Vec<Event>,
    pub created_at_ms: u128,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Agent {
    pub id: String,
    pub project_id: String,
    pub role: WorkerRole,
    pub thread_id: String,
    pub parent_thread_id: String,
    pub display_name: String,
    pub task: String,
    pub status: AgentStatus,
    pub owned_paths: Vec<String>,
    pub expected_evidence: Vec<String>,
    pub artifacts: Vec<Artifact>,
    pub messages: Vec<Message>,
    pub created_at_ms: u128,
    pub archived_at_ms: Option<u128>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Artifact {
    pub id: String,
    pub project_id: String,
    pub thread_id: String,
    pub kind: ArtifactKind,
    pub path: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub created_at_ms: u128,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Message {
    pub id: String,
    pub thread_id: String,
    pub text: String,
    pub final_message: bool,
    pub artifact_ids: Vec<String>,
    pub created_at_ms: u128,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct InboxEntry {
    pub id: String,
    pub project_id: String,
    pub orchestrator_thread_id: String,
    pub worker_thread_id: String,
    pub agent_id: String,
    pub message_id: String,
    pub artifact_ids: Vec<String>,
    pub created_at_ms: u128,
}
