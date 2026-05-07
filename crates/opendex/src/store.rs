use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{OpenDexError, OpenDexResult};
use crate::events::Event;
use crate::types::{Agent, Project, WorkerRole};

#[derive(Clone)]
pub(crate) struct StoredProject {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) root: String,
    pub(crate) orchestrator_thread_id: Option<String>,
    pub(crate) agents: BTreeMap<String, Agent>,
    pub(crate) inbox: Vec<crate::types::InboxEntry>,
    pub(crate) events: Vec<Event>,
    pub(crate) created_at_ms: u128,
}

pub(crate) fn assert_orchestrator(project: &StoredProject, thread_id: &str) -> OpenDexResult<()> {
    if project.orchestrator_thread_id.as_deref() == Some(thread_id) {
        return Ok(());
    }
    Err(OpenDexError::OrchestratorMismatch {
        project_id: project.id.clone(),
        thread_id: thread_id.to_string(),
    })
}

pub(crate) fn snapshot_project(project: &StoredProject) -> Project {
    Project {
        id: project.id.clone(),
        name: project.name.clone(),
        root: project.root.clone(),
        orchestrator_thread_id: project.orchestrator_thread_id.clone(),
        agents: project.agents.values().cloned().collect(),
        inbox: project.inbox.clone(),
        events: project.events.clone(),
        created_at_ms: project.created_at_ms,
    }
}

pub(crate) fn role_name(role: &WorkerRole) -> &'static str {
    match role {
        WorkerRole::Worker => "worker",
        WorkerRole::Qa => "qa",
    }
}

pub(crate) fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}
