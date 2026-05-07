mod agents;
mod artifacts;
mod event_log;
mod projects;
mod runtime_state;
mod spawn_guardrails;

use std::collections::BTreeMap;

use crate::error::{OpenDexError, OpenDexResult};
use crate::guardrails::{ThreadUsage, UsageGuardrails};
use crate::runtime::{LiveProcess, PendingApproval};
use crate::store::StoredProject;

#[derive(Default)]
pub struct ControlPlane {
    pub(crate) projects: BTreeMap<String, StoredProject>,
    pub(crate) agent_ids_by_thread: BTreeMap<String, String>,
    pub(crate) project_ids_by_thread: BTreeMap<String, String>,
    pub(crate) usage_by_thread: BTreeMap<String, ThreadUsage>,
    pub(crate) pending_approvals: BTreeMap<String, PendingApproval>,
    pub(crate) live_processes: BTreeMap<String, LiveProcess>,
    guardrails: UsageGuardrails,
    sequence: u64,
}

impl ControlPlane {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_guardrails(guardrails: UsageGuardrails) -> Self {
        Self {
            guardrails,
            ..Self::default()
        }
    }

    pub fn guardrails(&self) -> &UsageGuardrails {
        &self.guardrails
    }

    pub(crate) fn guardrail_limits(&self) -> &UsageGuardrails {
        &self.guardrails
    }

    pub(crate) fn agent_refs(&self, thread_id: &str) -> OpenDexResult<(String, String)> {
        let project_id = self
            .project_ids_by_thread
            .get(thread_id)
            .ok_or_else(|| OpenDexError::ThreadNotFound(thread_id.to_string()))?;
        let agent_id = self
            .agent_ids_by_thread
            .get(thread_id)
            .ok_or_else(|| OpenDexError::ThreadNotFound(thread_id.to_string()))?;
        Ok((project_id.clone(), agent_id.clone()))
    }

    pub(crate) fn take_project(&mut self, project_id: &str) -> OpenDexResult<StoredProject> {
        self.projects
            .remove(project_id)
            .ok_or_else(|| OpenDexError::ProjectNotFound(project_id.to_string()))
    }

    pub(crate) fn next_id(&mut self, prefix: &str) -> String {
        self.sequence += 1;
        format!("{prefix}-{}", self.sequence)
    }
}
