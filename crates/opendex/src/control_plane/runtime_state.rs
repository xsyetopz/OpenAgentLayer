use crate::control_plane::ControlPlane;
use crate::error::{OpenDexError, OpenDexResult};
use crate::events::EventKind;
use crate::guardrails::{ThreadUsage, UsageInput};
use crate::runtime::{ApprovalInput, LiveProcess, LiveProcessInput, PendingApproval};
use crate::store::now_ms;

impl ControlPlane {
    pub fn pending_approvals(&self) -> Vec<PendingApproval> {
        self.pending_approvals.values().cloned().collect()
    }

    pub fn live_processes(&self) -> Vec<LiveProcess> {
        self.live_processes.values().cloned().collect()
    }

    pub fn record_usage(&mut self, input: UsageInput) -> OpenDexResult<ThreadUsage> {
        let (project_id, agent_id) = self.agent_refs(&input.thread_id)?;
        let current = self
            .usage_by_thread
            .entry(input.thread_id.clone())
            .or_insert_with(|| ThreadUsage {
                thread_id: input.thread_id.clone(),
                ..ThreadUsage::default()
            });
        current.input_units = current.input_units.saturating_add(input.input_units);
        current.output_units = current.output_units.saturating_add(input.output_units);
        current.total_units = current.total_units.saturating_add(input.total_units);
        current.last_active_ms = input.at_ms;
        let usage = current.clone();
        let mut project = self.take_project(&project_id)?;
        self.record_event(
            &mut project,
            EventKind::UsageRecorded,
            Some(input.thread_id),
            Some(agent_id),
            Some(usage.total_units.to_string()),
        );
        self.projects.insert(project_id, project);
        Ok(usage)
    }

    pub fn request_approval(&mut self, input: ApprovalInput) -> OpenDexResult<PendingApproval> {
        let (project_id, agent_id) = self.agent_refs(&input.thread_id)?;
        let approval = PendingApproval {
            id: self.next_id("approval"),
            thread_id: input.thread_id,
            prompt: input.prompt,
            resolved: false,
            approved: None,
            created_at_ms: now_ms(),
            resolved_at_ms: None,
        };
        self.pending_approvals
            .insert(approval.id.clone(), approval.clone());
        let mut project = self.take_project(&project_id)?;
        self.record_event(
            &mut project,
            EventKind::ApprovalRequested,
            Some(approval.thread_id.clone()),
            Some(agent_id),
            Some(approval.id.clone()),
        );
        self.projects.insert(project_id, project);
        Ok(approval)
    }

    pub fn resolve_approval(
        &mut self,
        approval_id: &str,
        approved: bool,
    ) -> OpenDexResult<PendingApproval> {
        let approval = self
            .pending_approvals
            .get_mut(approval_id)
            .ok_or_else(|| OpenDexError::ApprovalNotFound(approval_id.to_string()))?;
        approval.resolved = true;
        approval.approved = Some(approved);
        approval.resolved_at_ms = Some(now_ms());
        let approval = approval.clone();
        let (project_id, agent_id) = self.agent_refs(&approval.thread_id)?;
        let mut project = self.take_project(&project_id)?;
        self.record_event(
            &mut project,
            EventKind::ApprovalResolved,
            Some(approval.thread_id.clone()),
            Some(agent_id),
            Some(approval.id.clone()),
        );
        self.projects.insert(project_id, project);
        Ok(approval)
    }

    pub fn register_live_process(&mut self, input: LiveProcessInput) -> OpenDexResult<LiveProcess> {
        let (project_id, agent_id) = self.agent_refs(&input.thread_id)?;
        let process = LiveProcess {
            id: self.next_id("process"),
            thread_id: input.thread_id,
            pid: input.pid,
            process_group_id: input.process_group_id,
            command: input.command,
            cwd: input.cwd,
            started_at_ms: now_ms(),
            completed_at_ms: None,
        };
        self.live_processes
            .insert(process.id.clone(), process.clone());
        let mut project = self.take_project(&project_id)?;
        self.record_event(
            &mut project,
            EventKind::LiveProcessRegistered,
            Some(process.thread_id.clone()),
            Some(agent_id),
            Some(process.id.clone()),
        );
        self.projects.insert(project_id, project);
        Ok(process)
    }

    pub fn complete_live_process(
        &mut self,
        thread_id: &str,
        process_id: &str,
    ) -> OpenDexResult<LiveProcess> {
        let process = self.live_processes.get_mut(process_id).ok_or_else(|| {
            OpenDexError::LiveProcessNotFound {
                thread_id: thread_id.to_string(),
                process_id: process_id.to_string(),
            }
        })?;
        if process.thread_id != thread_id {
            return Err(OpenDexError::LiveProcessNotFound {
                thread_id: thread_id.to_string(),
                process_id: process_id.to_string(),
            });
        }
        process.completed_at_ms = Some(now_ms());
        let process = process.clone();
        let (project_id, agent_id) = self.agent_refs(thread_id)?;
        let mut project = self.take_project(&project_id)?;
        self.record_event(
            &mut project,
            EventKind::LiveProcessCompleted,
            Some(thread_id.to_string()),
            Some(agent_id),
            Some(process_id.to_string()),
        );
        self.projects.insert(project_id, project);
        Ok(process)
    }
}
