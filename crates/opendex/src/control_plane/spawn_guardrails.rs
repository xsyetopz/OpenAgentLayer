use crate::control_plane::ControlPlane;
use crate::error::{OpenDexError, OpenDexResult};
use crate::store::{assert_orchestrator, now_ms};
use crate::types::AgentStatus;

impl ControlPlane {
    pub fn stale_open_threads(&self, project_id: &str, now_ms: u128) -> Vec<String> {
        let Some(project) = self.projects.get(project_id) else {
            return Vec::new();
        };
        project
            .agents
            .values()
            .filter(|agent| matches!(agent.status, AgentStatus::Running | AgentStatus::Waiting))
            .filter(|agent| {
                let last_active = self
                    .usage_by_thread
                    .get(&agent.thread_id)
                    .map(|usage| usage.last_active_ms)
                    .unwrap_or(agent.created_at_ms);
                now_ms.saturating_sub(last_active) >= self.guardrail_limits().stale_after_ms
            })
            .map(|agent| agent.thread_id.clone())
            .collect()
    }

    pub(crate) fn assert_spawn_allowed(
        &self,
        project_id: &str,
        orchestrator_thread_id: &str,
        requested_depth: u32,
    ) -> OpenDexResult<()> {
        let project = self
            .projects
            .get(project_id)
            .ok_or_else(|| OpenDexError::ProjectNotFound(project_id.to_string()))?;
        assert_orchestrator(project, orchestrator_thread_id)?;
        let guardrails = self.guardrail_limits();
        if requested_depth > guardrails.max_depth {
            return Err(OpenDexError::SpawnBlocked(format!(
                "depth limit {} exceeded",
                guardrails.max_depth
            )));
        }
        let stale = self.stale_open_threads(project_id, now_ms());
        if !stale.is_empty() {
            return Err(OpenDexError::SpawnBlocked(format!(
                "stale open worker threads: {}",
                stale.join(", ")
            )));
        }
        let open_workers = project
            .agents
            .values()
            .filter(|agent| matches!(agent.status, AgentStatus::Running | AgentStatus::Waiting))
            .count();
        if open_workers >= guardrails.max_open_workers {
            return Err(OpenDexError::SpawnBlocked(format!(
                "open worker limit {} reached",
                guardrails.max_open_workers
            )));
        }
        let session_units: u64 = self
            .usage_by_thread
            .values()
            .map(|usage| usage.total_units)
            .sum();
        if session_units >= guardrails.session_unit_limit {
            return Err(OpenDexError::SpawnBlocked(format!(
                "session unit limit {} reached",
                guardrails.session_unit_limit
            )));
        }
        for usage in self.usage_by_thread.values() {
            if usage.total_units >= guardrails.thread_unit_limit {
                return Err(OpenDexError::SpawnBlocked(format!(
                    "thread {} unit limit {} reached",
                    usage.thread_id, guardrails.thread_unit_limit
                )));
            }
        }
        Ok(())
    }
}
