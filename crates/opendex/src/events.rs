use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Event {
    pub id: String,
    pub project_id: String,
    pub kind: EventKind,
    pub thread_id: Option<String>,
    pub agent_id: Option<String>,
    pub message: Option<String>,
    pub created_at_ms: u128,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum EventKind {
    ProjectRegistered,
    OrchestratorAttached,
    AgentSpawned,
    MessageRecorded,
    ArtifactRecorded,
    WorkerRouted,
    ContinuationDecided,
    AgentArchived,
    UsageRecorded,
    ApprovalRequested,
    ApprovalResolved,
    LiveProcessRegistered,
    LiveProcessCompleted,
}
