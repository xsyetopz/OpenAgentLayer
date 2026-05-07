use crate::control_plane::ControlPlane;
use crate::error::{OpenDexError, OpenDexResult};
use crate::events::EventKind;
use crate::store::{assert_orchestrator, now_ms, role_name};
use crate::types::{Agent, AgentStatus, DecisionInput, DecisionKind, SpawnInput};

impl ControlPlane {
    pub fn spawn_agent(
        &mut self,
        project_id: &str,
        orchestrator_thread_id: &str,
        input: SpawnInput,
    ) -> OpenDexResult<Agent> {
        self.assert_spawn_allowed(project_id, orchestrator_thread_id, input.depth)?;
        let mut project = self.take_project(project_id)?;
        if let Err(error) = assert_orchestrator(&project, orchestrator_thread_id) {
            self.projects.insert(project_id.to_string(), project);
            return Err(error);
        }
        let thread_id = input.thread_id.unwrap_or_else(|| self.next_id("thread"));
        if self.agent_ids_by_thread.contains_key(&thread_id) {
            self.projects.insert(project_id.to_string(), project);
            return Err(OpenDexError::ThreadExists(thread_id));
        }
        let agent = Agent {
            id: self.next_id("agent"),
            project_id: project.id.clone(),
            role: input.role.clone(),
            thread_id: thread_id.clone(),
            parent_thread_id: input
                .parent_thread_id
                .unwrap_or_else(|| orchestrator_thread_id.to_string()),
            display_name: input
                .display_name
                .unwrap_or_else(|| role_name(&input.role).to_string()),
            task: input.task,
            status: AgentStatus::Running,
            owned_paths: input.owned_paths,
            expected_evidence: input.expected_evidence,
            artifacts: Vec::new(),
            messages: Vec::new(),
            created_at_ms: now_ms(),
            archived_at_ms: None,
        };
        self.agent_ids_by_thread
            .insert(thread_id.clone(), agent.id.clone());
        self.project_ids_by_thread
            .insert(thread_id.clone(), project.id.clone());
        project.agents.insert(agent.id.clone(), agent.clone());
        self.record_event(
            &mut project,
            EventKind::AgentSpawned,
            Some(thread_id),
            Some(agent.id.clone()),
            None,
        );
        self.projects.insert(project_id.to_string(), project);
        Ok(agent)
    }

    pub fn decide_continuation(
        &mut self,
        orchestrator_thread_id: &str,
        worker_thread_id: &str,
        input: DecisionInput,
    ) -> OpenDexResult<Agent> {
        let (project_id, agent_id) = self.agent_refs(worker_thread_id)?;
        let mut project = self.take_project(&project_id)?;
        if let Err(error) = assert_orchestrator(&project, orchestrator_thread_id) {
            self.projects.insert(project_id, project);
            return Err(error);
        }
        let agent = project
            .agents
            .get_mut(&agent_id)
            .ok_or_else(|| OpenDexError::ThreadNotFound(worker_thread_id.to_string()))?;
        agent.status = match input.kind {
            DecisionKind::Continue => AgentStatus::Running,
            DecisionKind::Approved => AgentStatus::Approved,
            DecisionKind::Blocked => AgentStatus::Blocked,
        };
        let snapshot = agent.clone();
        self.record_event(
            &mut project,
            EventKind::ContinuationDecided,
            Some(worker_thread_id.to_string()),
            Some(agent_id),
            input.note,
        );
        self.projects.insert(project_id, project);
        Ok(snapshot)
    }

    pub fn archive_agent(
        &mut self,
        orchestrator_thread_id: &str,
        worker_thread_id: &str,
    ) -> OpenDexResult<Agent> {
        let (project_id, agent_id) = self.agent_refs(worker_thread_id)?;
        let mut project = self.take_project(&project_id)?;
        if let Err(error) = assert_orchestrator(&project, orchestrator_thread_id) {
            self.projects.insert(project_id, project);
            return Err(error);
        }
        let agent = project
            .agents
            .get_mut(&agent_id)
            .ok_or_else(|| OpenDexError::ThreadNotFound(worker_thread_id.to_string()))?;
        agent.status = AgentStatus::Archived;
        agent.archived_at_ms = Some(now_ms());
        let snapshot = agent.clone();
        self.record_event(
            &mut project,
            EventKind::AgentArchived,
            Some(worker_thread_id.to_string()),
            Some(agent_id),
            None,
        );
        self.projects.insert(project_id, project);
        Ok(snapshot)
    }
}
