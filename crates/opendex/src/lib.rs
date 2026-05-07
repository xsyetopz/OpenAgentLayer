mod control_plane;
mod daemon;
mod error;
mod events;
mod guardrails;
mod json;
mod persistence;
mod runtime;
mod store;
mod types;

pub use control_plane::ControlPlane;
pub use daemon::{DaemonConfig, OpenDexDaemon};
pub use error::{OpenDexError, OpenDexResult};
pub use events::{Event, EventKind};
pub use guardrails::{ThreadUsage, UsageGuardrails, UsageInput};
pub use persistence::{FileSnapshotStore, SnapshotStore};
pub use runtime::{ApprovalInput, LiveProcess, LiveProcessInput, PendingApproval};
pub use types::{
    Agent, AgentStatus, Artifact, ArtifactInput, ArtifactKind, DecisionInput, DecisionKind,
    InboxEntry, Message, MessageInput, Project, ProjectInput, SpawnInput, WorkerRole,
};

#[cfg(test)]
mod tests {
    use super::*;

    fn project_input() -> ProjectInput {
        ProjectInput {
            id: Some("project-oal".to_string()),
            name: "OpenAgentLayer".to_string(),
            root: "/repo".to_string(),
            orchestrator_thread_id: Some("thread-parent".to_string()),
        }
    }

    fn spawn_input(thread_id: &str) -> SpawnInput {
        SpawnInput {
            role: WorkerRole::Worker,
            task: "implement opendex".to_string(),
            display_name: None,
            thread_id: Some(thread_id.to_string()),
            owned_paths: vec!["crates/opendex".to_string()],
            expected_evidence: vec!["cargo test -p opendex".to_string()],
            parent_thread_id: None,
            depth: 1,
        }
    }

    #[test]
    fn only_project_orchestrator_spawns_worker_sessions() {
        let mut control_plane = ControlPlane::new();
        control_plane.register_project(project_input()).unwrap();

        let error = control_plane
            .spawn_agent("project-oal", "thread-worker", spawn_input("thread-worker"))
            .unwrap_err();
        assert_eq!(
            error,
            OpenDexError::OrchestratorMismatch {
                project_id: "project-oal".to_string(),
                thread_id: "thread-worker".to_string()
            }
        );

        let agent = control_plane
            .spawn_agent("project-oal", "thread-parent", spawn_input("thread-worker"))
            .unwrap();
        assert_eq!(agent.thread_id, "thread-worker");
        assert_eq!(agent.parent_thread_id, "thread-parent");
        assert_eq!(agent.status, AgentStatus::Running);
    }

    #[test]
    fn final_worker_messages_route_artifacts_to_orchestrator_inbox() {
        let mut control_plane = ControlPlane::new();
        control_plane.register_project(project_input()).unwrap();
        control_plane
            .spawn_agent("project-oal", "thread-parent", spawn_input("thread-worker"))
            .unwrap();
        let screenshot = control_plane
            .record_artifact(
                "thread-worker",
                ArtifactInput {
                    kind: ArtifactKind::Screenshot,
                    path: Some(".openagentlayer/opendex/run-1/screenshot.png".to_string()),
                    title: Some("Rendered state".to_string()),
                    description: None,
                },
            )
            .unwrap();
        let message = control_plane
            .record_message(
                "thread-worker",
                MessageInput {
                    text: "Implemented with evidence.".to_string(),
                    final_message: true,
                    artifact_ids: vec![screenshot.id.clone()],
                },
            )
            .unwrap();
        let project = control_plane.project("project-oal").unwrap();

        assert!(message.final_message);
        assert_eq!(project.agents[0].status, AgentStatus::Waiting);
        assert_eq!(project.inbox.len(), 1);
        assert_eq!(project.inbox[0].orchestrator_thread_id, "thread-parent");
        assert_eq!(project.inbox[0].artifact_ids, vec![screenshot.id]);
        assert!(
            project
                .events
                .iter()
                .any(|event| event.kind == EventKind::WorkerRouted)
        );
    }

    #[test]
    fn parent_thread_owns_continuation_and_archival() {
        let mut control_plane = ControlPlane::new();
        control_plane.register_project(project_input()).unwrap();
        control_plane
            .spawn_agent("project-oal", "thread-parent", spawn_input("thread-worker"))
            .unwrap();
        control_plane
            .record_message(
                "thread-worker",
                MessageInput {
                    text: "Need another pass.".to_string(),
                    final_message: true,
                    artifact_ids: Vec::new(),
                },
            )
            .unwrap();

        assert!(matches!(
            control_plane.decide_continuation(
                "thread-worker",
                "thread-worker",
                DecisionInput {
                    kind: DecisionKind::Approved,
                    note: None
                }
            ),
            Err(OpenDexError::OrchestratorMismatch { .. })
        ));
        assert_eq!(
            control_plane
                .decide_continuation(
                    "thread-parent",
                    "thread-worker",
                    DecisionInput {
                        kind: DecisionKind::Continue,
                        note: Some("Add tests.".to_string())
                    }
                )
                .unwrap()
                .status,
            AgentStatus::Running
        );
        assert_eq!(
            control_plane
                .archive_agent("thread-parent", "thread-worker")
                .unwrap()
                .status,
            AgentStatus::Archived
        );
    }

    #[test]
    fn usage_guardrails_block_excess_open_workers_and_depth() {
        let mut control_plane = ControlPlane::with_guardrails(UsageGuardrails {
            max_open_workers: 1,
            max_depth: 1,
            thread_unit_limit: 1_000,
            session_unit_limit: 10_000,
            stale_after_ms: 60_000,
        });
        control_plane.register_project(project_input()).unwrap();
        control_plane
            .spawn_agent("project-oal", "thread-parent", spawn_input("thread-worker"))
            .unwrap();

        let blocked = control_plane
            .spawn_agent(
                "project-oal",
                "thread-parent",
                spawn_input("thread-worker-2"),
            )
            .unwrap_err();
        assert_eq!(
            blocked,
            OpenDexError::SpawnBlocked("open worker limit 1 reached".to_string())
        );

        control_plane
            .archive_agent("thread-parent", "thread-worker")
            .unwrap();
        let mut deep_spawn = spawn_input("thread-deep");
        deep_spawn.depth = 2;
        assert!(matches!(
            control_plane.spawn_agent("project-oal", "thread-parent", deep_spawn),
            Err(OpenDexError::SpawnBlocked(reason)) if reason == "depth limit 1 exceeded"
        ));
    }

    #[test]
    fn usage_approvals_processes_and_replay_are_control_plane_state() {
        let mut control_plane = ControlPlane::new();
        control_plane.register_project(project_input()).unwrap();
        control_plane
            .spawn_agent("project-oal", "thread-parent", spawn_input("thread-worker"))
            .unwrap();
        let usage = control_plane
            .record_usage(UsageInput {
                thread_id: "thread-worker".to_string(),
                input_units: 10,
                output_units: 3,
                total_units: 13,
                at_ms: 1_000,
            })
            .unwrap();
        assert_eq!(usage.total_units, 13);

        let approval = control_plane
            .request_approval(ApprovalInput {
                thread_id: "thread-worker".to_string(),
                prompt: "Allow write?".to_string(),
            })
            .unwrap();
        assert!(!approval.resolved);
        assert_eq!(
            control_plane
                .resolve_approval(&approval.id, true)
                .unwrap()
                .approved,
            Some(true)
        );

        let process = control_plane
            .register_live_process(LiveProcessInput {
                thread_id: "thread-worker".to_string(),
                pid: 42,
                process_group_id: Some(42),
                command: "cargo test -p opendex".to_string(),
                cwd: "/repo".to_string(),
            })
            .unwrap();
        assert_eq!(
            control_plane
                .complete_live_process("thread-worker", &process.id)
                .unwrap()
                .pid,
            42
        );
        let all_events = control_plane.replay_events("project-oal", None);
        let replayed = control_plane.replay_events("project-oal", Some(&all_events[1].id));
        assert!(
            replayed
                .iter()
                .any(|event| event.kind == EventKind::ApprovalResolved)
        );
        assert!(
            replayed
                .iter()
                .any(|event| event.kind == EventKind::LiveProcessCompleted)
        );
    }

    #[test]
    fn stale_open_worker_threads_block_new_spawn() {
        let mut control_plane = ControlPlane::with_guardrails(UsageGuardrails {
            max_open_workers: 2,
            max_depth: 1,
            thread_unit_limit: 1_000_000,
            session_unit_limit: 2_000_000,
            stale_after_ms: 1,
        });
        control_plane.register_project(project_input()).unwrap();
        control_plane
            .spawn_agent("project-oal", "thread-parent", spawn_input("thread-worker"))
            .unwrap();
        control_plane
            .record_usage(UsageInput {
                thread_id: "thread-worker".to_string(),
                input_units: 1,
                output_units: 1,
                total_units: 2,
                at_ms: 1,
            })
            .unwrap();
        assert_eq!(
            control_plane.stale_open_threads("project-oal", 3),
            vec!["thread-worker".to_string()]
        );
        assert!(matches!(
            control_plane.spawn_agent("project-oal", "thread-parent", spawn_input("thread-worker-2")),
            Err(OpenDexError::SpawnBlocked(reason)) if reason.contains("stale open worker threads")
        ));
    }

    #[test]
    fn daemon_renders_health_info_state_and_event_replay() {
        let mut control_plane = ControlPlane::new();
        control_plane.register_project(project_input()).unwrap();
        control_plane
            .spawn_agent("project-oal", "thread-parent", spawn_input("thread-worker"))
            .unwrap();
        let mut daemon = OpenDexDaemon::new(control_plane, DaemonConfig::default());

        let health = daemon.handle_request("GET /health HTTP/1.1\r\n\r\n");
        assert_eq!(health.status_code, 200);
        assert!(health.body.contains("\"status\":\"ok\""));

        let info = daemon.handle_request("GET /info HTTP/1.1\r\n\r\n");
        assert_eq!(info.status_code, 200);
        assert!(info.body.contains("\"product\":\"OpenDex\""));

        let state = daemon.handle_request("GET /state HTTP/1.1\r\n\r\n");
        assert_eq!(state.status_code, 200);
        assert!(state.body.contains("\"projects\""));
        assert!(state.body.contains("\"thread-worker\""));

        let events = daemon.handle_request("GET /projects/project-oal/events HTTP/1.1\r\n\r\n");
        assert_eq!(events.status_code, 200);
        assert!(events.body.contains("\"AgentSpawned\""));
    }

    #[test]
    fn daemon_mutation_routes_cover_robdex_control_plane_actions() {
        let mut daemon = OpenDexDaemon::new(ControlPlane::new(), DaemonConfig::default());

        assert_eq!(
            daemon
                .handle_request(
                    "POST /projects?id=project-oal&name=OpenAgentLayer&root=/repo&orchestrator_thread_id=thread-parent HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );
        assert_eq!(
            daemon
                .handle_request(
                    "POST /projects/project-oal/agents?orchestrator_thread_id=thread-parent&thread_id=thread-worker&task=implement+OpenDex&owned_paths=crates/opendex&expected_evidence=cargo+test&depth=1 HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );
        assert_eq!(
            daemon
                .handle_request(
                    "POST /threads/thread-worker/artifacts?kind=Log&path=opendex.log&title=Run+log HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );
        assert_eq!(
            daemon
                .handle_request(
                    "POST /threads/thread-worker/messages?text=Done&final=true HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );
        assert_eq!(
            daemon
                .handle_request(
                    "POST /threads/thread-worker/usage?input_units=10&output_units=5&total_units=15&at_ms=1 HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );
        assert_eq!(
            daemon
                .handle_request(
                    "POST /threads/thread-worker/approvals?prompt=Allow+write HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );
        assert_eq!(
            daemon
                .handle_request(
                    "POST /threads/thread-worker/processes/register?pid=42&process_group_id=42&command=cargo+test&cwd=/repo HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );
        assert_eq!(
            daemon
                .handle_request(
                    "POST /threads/thread-worker/decide?orchestrator_thread_id=thread-parent&kind=approved&note=verified HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );
        assert_eq!(
            daemon
                .handle_request(
                    "POST /threads/thread-worker/archive?orchestrator_thread_id=thread-parent HTTP/1.1\r\n\r\n"
                )
                .status_code,
            200
        );

        let state = daemon.handle_request("GET /state HTTP/1.1\r\n\r\n");
        assert!(state.body.contains("\"thread-worker\""));
        assert!(state.body.contains("\"Archived\""));
        assert!(state.body.contains("\"WorkerRouted\""));
    }

    #[test]
    fn file_snapshot_store_persists_control_plane_state() {
        let mut control_plane = ControlPlane::new();
        control_plane.register_project(project_input()).unwrap();
        let path = std::env::temp_dir().join(format!(
            "opendex-test-{}-{}.json",
            std::process::id(),
            control_plane.snapshot()[0].created_at_ms
        ));
        let store = FileSnapshotStore::new(path.clone());

        store.save(&control_plane).unwrap();
        let saved = std::fs::read_to_string(&path).unwrap();
        assert!(saved.contains("\"schema\":\"opendex.snapshot.v1\""));
        assert!(saved.contains("\"project-oal\""));
        std::fs::remove_file(path).unwrap();
    }
}

#[cfg(test)]
mod route_tests;
