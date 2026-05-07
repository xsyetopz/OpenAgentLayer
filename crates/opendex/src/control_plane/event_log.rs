use crate::control_plane::ControlPlane;
use crate::events::{Event, EventKind};
use crate::store::{StoredProject, now_ms};

impl ControlPlane {
    pub(crate) fn record_event(
        &mut self,
        project: &mut StoredProject,
        kind: EventKind,
        thread_id: Option<String>,
        agent_id: Option<String>,
        message: Option<String>,
    ) {
        let event = Event {
            id: self.next_id("event"),
            project_id: project.id.clone(),
            kind,
            thread_id,
            agent_id,
            message,
            created_at_ms: now_ms(),
        };
        project.events.push(event);
    }

    pub fn replay_events(&self, project_id: &str, after_event_id: Option<&str>) -> Vec<Event> {
        let Some(project) = self.projects.get(project_id) else {
            return Vec::new();
        };
        match after_event_id {
            Some(after) => project
                .events
                .iter()
                .skip_while(|event| event.id != after)
                .skip(1)
                .cloned()
                .collect(),
            None => project.events.clone(),
        }
    }

    pub fn replay_all_events(&self) -> Vec<Event> {
        self.projects
            .values()
            .flat_map(|project| project.events.iter().cloned())
            .collect()
    }
}
