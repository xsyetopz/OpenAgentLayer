use crate::control_plane::ControlPlane;
use crate::error::{OpenDexError, OpenDexResult};
use crate::events::EventKind;
use crate::store::{StoredProject, now_ms};
use crate::types::{AgentStatus, Artifact, ArtifactInput, InboxEntry, Message, MessageInput};

impl ControlPlane {
    pub fn record_artifact(
        &mut self,
        thread_id: &str,
        input: ArtifactInput,
    ) -> OpenDexResult<Artifact> {
        let (project_id, agent_id) = self.agent_refs(thread_id)?;
        let mut project = self.take_project(&project_id)?;
        let artifact = Artifact {
            id: self.next_id("artifact"),
            project_id: project.id.clone(),
            thread_id: thread_id.to_string(),
            kind: input.kind,
            path: input.path,
            title: input.title,
            description: input.description,
            created_at_ms: now_ms(),
        };
        let agent = project
            .agents
            .get_mut(&agent_id)
            .ok_or_else(|| OpenDexError::ThreadNotFound(thread_id.to_string()))?;
        agent.artifacts.push(artifact.clone());
        self.record_event(
            &mut project,
            EventKind::ArtifactRecorded,
            Some(thread_id.to_string()),
            Some(agent_id),
            Some(artifact.id.clone()),
        );
        self.projects.insert(project_id, project);
        Ok(artifact)
    }

    pub fn record_message(
        &mut self,
        thread_id: &str,
        input: MessageInput,
    ) -> OpenDexResult<Message> {
        let (project_id, agent_id) = self.agent_refs(thread_id)?;
        let mut project = self.take_project(&project_id)?;
        let message = {
            let agent = project
                .agents
                .get_mut(&agent_id)
                .ok_or_else(|| OpenDexError::ThreadNotFound(thread_id.to_string()))?;
            for artifact_id in &input.artifact_ids {
                if !agent
                    .artifacts
                    .iter()
                    .any(|artifact| &artifact.id == artifact_id)
                {
                    self.projects.insert(project_id, project);
                    return Err(OpenDexError::ArtifactNotOwned {
                        thread_id: thread_id.to_string(),
                        artifact_id: artifact_id.clone(),
                    });
                }
            }
            let message = Message {
                id: self.next_id("message"),
                thread_id: thread_id.to_string(),
                text: input.text,
                final_message: input.final_message,
                artifact_ids: input.artifact_ids,
                created_at_ms: now_ms(),
            };
            agent.messages.push(message.clone());
            message
        };
        self.record_event(
            &mut project,
            EventKind::MessageRecorded,
            Some(thread_id.to_string()),
            Some(agent_id.clone()),
            Some(message.id.clone()),
        );
        if message.final_message
            && let Err(error) = route_final_worker_message(self, &mut project, &agent_id, &message)
        {
            self.projects.insert(project_id, project);
            return Err(error);
        }
        self.projects.insert(project_id, project);
        Ok(message)
    }
}

fn route_final_worker_message(
    control_plane: &mut ControlPlane,
    project: &mut StoredProject,
    agent_id: &str,
    message: &Message,
) -> OpenDexResult<()> {
    let orchestrator_thread_id = project
        .orchestrator_thread_id
        .clone()
        .ok_or_else(|| OpenDexError::MissingOrchestrator(project.id.clone()))?;
    let agent = project
        .agents
        .get_mut(agent_id)
        .ok_or_else(|| OpenDexError::ThreadNotFound(message.thread_id.clone()))?;
    agent.status = AgentStatus::Waiting;
    let entry = InboxEntry {
        id: control_plane.next_id("inbox"),
        project_id: project.id.clone(),
        orchestrator_thread_id,
        worker_thread_id: message.thread_id.clone(),
        agent_id: agent_id.to_string(),
        message_id: message.id.clone(),
        artifact_ids: message.artifact_ids.clone(),
        created_at_ms: now_ms(),
    };
    project.inbox.push(entry);
    control_plane.record_event(
        project,
        EventKind::WorkerRouted,
        Some(message.thread_id.clone()),
        Some(agent_id.to_string()),
        Some(message.id.clone()),
    );
    Ok(())
}
