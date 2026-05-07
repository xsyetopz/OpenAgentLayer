use std::collections::BTreeMap;

use crate::control_plane::ControlPlane;
use crate::error::{OpenDexError, OpenDexResult};
use crate::events::EventKind;
use crate::store::{StoredProject, now_ms, snapshot_project};
use crate::types::{Project, ProjectInput};

impl ControlPlane {
    pub fn register_project(&mut self, input: ProjectInput) -> OpenDexResult<Project> {
        let id = input.id.unwrap_or_else(|| self.next_id("project"));
        if self.projects.contains_key(&id) {
            return Err(OpenDexError::ProjectExists(id));
        }
        let mut project = StoredProject {
            id: id.clone(),
            name: input.name,
            root: input.root,
            orchestrator_thread_id: input.orchestrator_thread_id,
            agents: BTreeMap::new(),
            inbox: Vec::new(),
            events: Vec::new(),
            created_at_ms: now_ms(),
        };
        self.record_event(&mut project, EventKind::ProjectRegistered, None, None, None);
        if let Some(thread_id) = project.orchestrator_thread_id.clone() {
            self.record_event(
                &mut project,
                EventKind::OrchestratorAttached,
                Some(thread_id),
                None,
                None,
            );
        }
        self.projects.insert(id.clone(), project);
        self.project(&id)
    }

    pub fn attach_orchestrator(
        &mut self,
        project_id: &str,
        thread_id: impl Into<String>,
    ) -> OpenDexResult<Project> {
        let thread_id = thread_id.into();
        let mut project = self.take_project(project_id)?;
        project.orchestrator_thread_id = Some(thread_id.clone());
        self.record_event(
            &mut project,
            EventKind::OrchestratorAttached,
            Some(thread_id),
            None,
            None,
        );
        let snapshot = snapshot_project(&project);
        self.projects.insert(project_id.to_string(), project);
        Ok(snapshot)
    }

    pub fn project(&self, project_id: &str) -> OpenDexResult<Project> {
        self.projects
            .get(project_id)
            .map(snapshot_project)
            .ok_or_else(|| OpenDexError::ProjectNotFound(project_id.to_string()))
    }

    pub fn snapshot(&self) -> Vec<Project> {
        self.projects.values().map(snapshot_project).collect()
    }
}
