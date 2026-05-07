use std::io::{self, Read, Write};
use std::mem::take;
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::str::from_utf8;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::ws::{Message as WsMessage, WebSocket, WebSocketUpgrade};
use axum::extract::{Path as AxumPath, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::json;
use tokio::sync::Mutex;

use crate::control_plane::ControlPlane;
use crate::json::{events_json, projects_json};
use crate::persistence::{FileSnapshotStore, SnapshotStore};
use crate::{
    ApprovalInput, ArtifactInput, ArtifactKind, DecisionInput, DecisionKind, LiveProcessInput,
    MessageInput, OpenDexResult, ProjectInput, SpawnInput, UsageInput, WorkerRole,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DaemonConfig {
    pub state_path: Option<PathBuf>,
    pub request_limit: Option<usize>,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            state_path: None,
            request_limit: Some(1),
        }
    }
}

pub struct OpenDexDaemon {
    control_plane: ControlPlane,
    config: DaemonConfig,
}

#[derive(Clone)]
struct AppState {
    control_plane: Arc<Mutex<ControlPlane>>,
    config: DaemonConfig,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HttpResponse {
    pub status_code: u16,
    pub status_text: &'static str,
    pub body: String,
}

impl OpenDexDaemon {
    pub fn new(control_plane: ControlPlane, config: DaemonConfig) -> Self {
        Self {
            control_plane,
            config,
        }
    }

    pub fn serve<A: ToSocketAddrs>(&mut self, address: A) -> io::Result<()> {
        let listener = TcpListener::bind(address)?;
        for (served, stream) in listener.incoming().enumerate() {
            self.handle_stream(stream?)?;
            if self
                .config
                .request_limit
                .is_some_and(|limit| served + 1 >= limit)
            {
                break;
            }
        }
        self.persist()
    }

    pub async fn serve_async(&mut self, address: &str) -> io::Result<()> {
        if let Some(path) = self.config.state_path.clone()
            && let Some(loaded) = FileSnapshotStore::new(path).load()?
        {
            self.control_plane = loaded;
        }
        let state = AppState {
            control_plane: Arc::new(Mutex::new(take(&mut self.control_plane))),
            config: self.config.clone(),
        };
        let listener = tokio::net::TcpListener::bind(address).await?;
        axum::serve(listener, router(state))
            .await
            .map_err(io::Error::other)
    }

    pub fn handle_request(&mut self, request: &str) -> HttpResponse {
        let Some(request_line) = request.lines().next() else {
            return response(400, "Bad Request", "{\"error\":\"missing request line\"}");
        };
        let mut parts = request_line.split_whitespace();
        let method = parts.next().unwrap_or_default();
        let target = parts.next().unwrap_or_default();
        let path = target.split('?').next().unwrap_or(target);
        let query = Query::from_target(target);
        match method {
            "GET" => self.handle_get(path),
            "POST" => self.handle_post(path, &query),
            "DELETE" => self.handle_delete(path, &query),
            _ => response(
                405,
                "Method Not Allowed",
                "{\"error\":\"method not allowed\"}",
            ),
        }
    }

    pub fn persist(&self) -> io::Result<()> {
        let Some(path) = self.config.state_path.clone() else {
            return Ok(());
        };
        FileSnapshotStore::new(path).save(&self.control_plane)
    }

    fn handle_stream(&mut self, mut stream: TcpStream) -> io::Result<()> {
        stream.set_read_timeout(Some(Duration::from_secs(5)))?;
        let mut buffer = [0u8; 8192];
        let size = stream.read(&mut buffer)?;
        let request = String::from_utf8_lossy(&buffer[..size]);
        let response = self.handle_request(&request);
        stream.write_all(response.to_http().as_bytes())
    }

    fn handle_get(&self, path: &str) -> HttpResponse {
        match path {
            "/health" | "/healthz" => {
                response(200, "OK", "{\"status\":\"ok\",\"product\":\"OpenDex\"}")
            }
            "/info" => response(
                200,
                "OK",
                &format!(
                    "{{\"product\":\"OpenDex\",\"version\":\"{}\",\"state_path\":{}}}",
                    env!("CARGO_PKG_VERSION"),
                    self.config
                        .state_path
                        .as_ref()
                        .map(|path| format!("\"{}\"", path.display()))
                        .unwrap_or_else(|| "null".to_string())
                ),
            ),
            "/state" | "/state/app" | "/state/snapshot" | "/workbench/bootstrap" => {
                response(200, "OK", &projects_json(&self.control_plane.snapshot()))
            }
            "/models" => response(200, "OK", "{\"models\":[]}"),
            "/ws" | "/workbench/ws" => response(
                200,
                "OK",
                &events_json(&self.control_plane.replay_all_events()),
            ),
            "/services/qa-harness/summary" => response(200, "OK", "{\"devices\":[]}"),
            "/images/thumbnail" | "/images/image" => response(200, "OK", "{\"image\":null}"),
            "/threads/messages" => {
                response(200, "OK", &projects_json(&self.control_plane.snapshot()))
            }
            "/events/replay" => response(
                200,
                "OK",
                &events_json(&self.control_plane.replay_all_events()),
            ),
            "/orchestrator/whoami" => response(
                200,
                "OK",
                "{\"product\":\"OpenDex\",\"role\":\"orchestrator\"}",
            ),
            "/orchestrator/lookup"
            | "/orchestrator/threads"
            | "/orchestrator/agents"
            | "/orchestrator/thread-groups" => {
                response(200, "OK", &projects_json(&self.control_plane.snapshot()))
            }
            "/orchestrator/pending-approvals" => response(
                200,
                "OK",
                &format!(
                    "{{\"pending_approvals\":{}}}",
                    self.control_plane.pending_approvals().len()
                ),
            ),
            path if path.starts_with("/projects/") && path.ends_with("/events") => {
                let project_id = path
                    .trim_start_matches("/projects/")
                    .trim_end_matches("/events")
                    .trim_end_matches('/');
                response(
                    200,
                    "OK",
                    &events_json(&self.control_plane.replay_events(project_id, None)),
                )
            }
            path if path.starts_with("/projects/") && path.ends_with("/hook-logs") => {
                response(200, "OK", "{\"hook_logs\":[]}")
            }
            path if path.starts_with("/threads/") && path.ends_with("/qa/devices") => {
                response(200, "OK", "{\"devices\":[]}")
            }
            _ => response(404, "Not Found", "{\"error\":\"not found\"}"),
        }
    }

    fn handle_post(&mut self, path: &str, query: &Query) -> HttpResponse {
        let result = match path {
            "/state/project-catalog" | "/projects/select" | "/uploads/images" => Ok(()),
            "/projects" => self
                .control_plane
                .register_project(ProjectInput {
                    id: query.optional("id"),
                    name: query.string("name", "OpenDex project"),
                    root: query.string("root", "."),
                    orchestrator_thread_id: query.optional("orchestrator_thread_id"),
                })
                .map(|_| ()),
            path if path.starts_with("/projects/")
                && !path.ends_with("/agents")
                && !path.contains("/hook-logs") =>
            {
                if path.ends_with("/orchestrator") {
                    let project_id = path
                        .trim_start_matches("/projects/")
                        .trim_end_matches("/orchestrator")
                        .trim_end_matches('/');
                    self.control_plane
                        .attach_orchestrator(project_id, query.string("thread_id", "thread-parent"))
                        .map(|_| ())
                } else {
                    Ok(())
                }
            }
            path if path.starts_with("/projects/") && path.ends_with("/hook-logs") => Ok(()),
            "/threads" | "/orchestrator/spawn-agent" => {
                let project_id = query.string("project_id", "project-oal");
                self.control_plane
                    .spawn_agent(
                        &project_id,
                        &query.string("orchestrator_thread_id", "thread-parent"),
                        SpawnInput {
                            role: query.worker_role(),
                            task: query.string("task", ""),
                            display_name: query.optional("display_name"),
                            thread_id: query.optional("thread_id"),
                            owned_paths: query.list("owned_paths"),
                            expected_evidence: query.list("expected_evidence"),
                            parent_thread_id: query.optional("parent_thread_id"),
                            depth: query.u32("depth", 1),
                        },
                    )
                    .map(|_| ())
            }
            path if path.starts_with("/projects/") && path.ends_with("/orchestrator-legacy") => {
                let project_id = path
                    .trim_start_matches("/projects/")
                    .trim_end_matches("/orchestrator-legacy")
                    .trim_end_matches('/');
                self.control_plane
                    .attach_orchestrator(project_id, query.string("thread_id", "thread-parent"))
                    .map(|_| ())
            }
            path if path.starts_with("/projects/") && path.ends_with("/agents") => {
                let project_id = path
                    .trim_start_matches("/projects/")
                    .trim_end_matches("/agents")
                    .trim_end_matches('/');
                self.control_plane
                    .spawn_agent(
                        project_id,
                        &query.string("orchestrator_thread_id", "thread-parent"),
                        SpawnInput {
                            role: query.worker_role(),
                            task: query.string("task", ""),
                            display_name: query.optional("display_name"),
                            thread_id: query.optional("thread_id"),
                            owned_paths: query.list("owned_paths"),
                            expected_evidence: query.list("expected_evidence"),
                            parent_thread_id: query.optional("parent_thread_id"),
                            depth: query.u32("depth", 1),
                        },
                    )
                    .map(|_| ())
            }
            path if path.starts_with("/threads/") && path.ends_with("/artifacts") => {
                let thread_id = path
                    .trim_start_matches("/threads/")
                    .trim_end_matches("/artifacts")
                    .trim_end_matches('/');
                self.control_plane
                    .record_artifact(
                        thread_id,
                        ArtifactInput {
                            kind: query.artifact_kind(),
                            path: query.optional("path"),
                            title: query.optional("title"),
                            description: query.optional("description"),
                        },
                    )
                    .map(|_| ())
            }
            path if path.starts_with("/threads/") && path.ends_with("/messages") => {
                let thread_id = path
                    .trim_start_matches("/threads/")
                    .trim_end_matches("/messages")
                    .trim_end_matches('/');
                self.control_plane
                    .record_message(
                        thread_id,
                        MessageInput {
                            text: query.string("text", ""),
                            final_message: query.bool("final", false),
                            artifact_ids: query.list("artifact_ids"),
                        },
                    )
                    .map(|_| ())
            }
            "/orchestrator/agent-message" | "/orchestrator/warm-handoff" => {
                let thread_id = query.string("thread_id", "");
                self.control_plane
                    .record_message(
                        &thread_id,
                        MessageInput {
                            text: query.string("text", ""),
                            final_message: true,
                            artifact_ids: query.list("artifact_ids"),
                        },
                    )
                    .map(|_| ())
            }
            path if path.starts_with("/threads/") && path.ends_with("/usage") => {
                let thread_id = path
                    .trim_start_matches("/threads/")
                    .trim_end_matches("/usage")
                    .trim_end_matches('/');
                self.control_plane
                    .record_usage(UsageInput {
                        thread_id: thread_id.to_string(),
                        input_units: query.u64("input_units", 0),
                        output_units: query.u64("output_units", 0),
                        total_units: query.u64("total_units", 0),
                        at_ms: query.u128("at_ms", 0),
                    })
                    .map(|_| ())
            }
            path if path.starts_with("/threads/") && path.ends_with("/approvals") => {
                let thread_id = path
                    .trim_start_matches("/threads/")
                    .trim_end_matches("/approvals")
                    .trim_end_matches('/');
                self.control_plane
                    .request_approval(ApprovalInput {
                        thread_id: thread_id.to_string(),
                        prompt: query.string("prompt", ""),
                    })
                    .map(|_| ())
            }
            "/orchestrator/approval-decision" => self
                .control_plane
                .resolve_approval(
                    &query.string("approval_id", ""),
                    query.bool("approved", false),
                )
                .map(|_| ()),
            path if path.starts_with("/approvals/") && path.ends_with("/resolve") => {
                let approval_id = path
                    .trim_start_matches("/approvals/")
                    .trim_end_matches("/resolve")
                    .trim_end_matches('/');
                self.control_plane
                    .resolve_approval(approval_id, query.bool("approved", false))
                    .map(|_| ())
            }
            path if path.starts_with("/threads/") && path.ends_with("/processes/register") => {
                let thread_id = path
                    .trim_start_matches("/threads/")
                    .trim_end_matches("/processes/register")
                    .trim_end_matches('/');
                self.control_plane
                    .register_live_process(LiveProcessInput {
                        thread_id: thread_id.to_string(),
                        pid: query.u32("pid", 0),
                        process_group_id: query
                            .optional("process_group_id")
                            .and_then(|value| value.parse().ok()),
                        command: query.string("command", ""),
                        cwd: query.string("cwd", "."),
                    })
                    .map(|_| ())
            }
            path if path.starts_with("/threads/")
                && path.contains("/processes/")
                && path.ends_with("/complete") =>
            {
                let trimmed = path.trim_start_matches("/threads/");
                let Some((thread_id, rest)) = trimmed.split_once("/processes/") else {
                    return response(404, "Not Found", "{\"error\":\"not found\"}");
                };
                let process_id = rest.trim_end_matches("/complete").trim_end_matches('/');
                self.control_plane
                    .complete_live_process(thread_id, process_id)
                    .map(|_| ())
            }
            path if path.starts_with("/threads/") && path.ends_with("/decide") => {
                let thread_id = path
                    .trim_start_matches("/threads/")
                    .trim_end_matches("/decide")
                    .trim_end_matches('/');
                self.control_plane
                    .decide_continuation(
                        &query.string("orchestrator_thread_id", "thread-parent"),
                        thread_id,
                        DecisionInput {
                            kind: query.decision_kind(),
                            note: query.optional("note"),
                        },
                    )
                    .map(|_| ())
            }
            "/orchestrator/archive-agent" => self
                .control_plane
                .archive_agent(
                    &query.string("orchestrator_thread_id", "thread-parent"),
                    &query.string("thread_id", ""),
                )
                .map(|_| ()),
            "/orchestrator/rename-agent"
            | "/orchestrator/worker-metadata"
            | "/orchestrator/thread-groups/create"
            | "/orchestrator/thread-groups/update"
            | "/orchestrator/thread-groups/move-thread"
            | "/orchestrator/thread-groups/delete"
            | "/orchestrator/thread-groups/archive"
            | "/mcp/refresh" => Ok(()),
            path if path.starts_with("/threads/")
                && (path.ends_with("/name")
                    || path.ends_with("/metadata")
                    || path.ends_with("/compact")
                    || path.ends_with("/commands/terminate")
                    || path.ends_with("/running-state")
                    || path.ends_with("/interrupt")
                    || path.contains("/qa/devices/")) =>
            {
                Ok(())
            }
            path if path.starts_with("/threads/") && path.ends_with("/archive") => {
                let thread_id = path
                    .trim_start_matches("/threads/")
                    .trim_end_matches("/archive")
                    .trim_end_matches('/');
                self.control_plane
                    .archive_agent(
                        &query.string("orchestrator_thread_id", "thread-parent"),
                        thread_id,
                    )
                    .map(|_| ())
            }
            _ => return response(404, "Not Found", "{\"error\":\"not found\"}"),
        };
        match result {
            Ok(()) => match self.persist() {
                Ok(()) => response(200, "OK", "{\"ok\":true}"),
                Err(error) => response(
                    500,
                    "Internal Server Error",
                    &format!("{{\"error\":\"persist failed: {error}\"}}"),
                ),
            },
            Err(error) => response(409, "Conflict", &format!("{{\"error\":\"{error}\"}}")),
        }
    }

    fn handle_delete(&mut self, path: &str, query: &Query) -> HttpResponse {
        let result = match path {
            path if path.starts_with("/threads/") => {
                let thread_id = path.trim_start_matches("/threads/").trim_end_matches('/');
                self.control_plane
                    .archive_agent(
                        &query.string("orchestrator_thread_id", "thread-parent"),
                        thread_id,
                    )
                    .map(|_| ())
            }
            path if path.starts_with("/projects/") && path.ends_with("/hook-logs") => Ok(()),
            path if path.starts_with("/projects/") => Ok(()),
            _ => return response(404, "Not Found", "{\"error\":\"not found\"}"),
        };
        match result {
            Ok(()) => response(200, "OK", "{\"ok\":true}"),
            Err(error) => response(409, "Conflict", &format!("{{\"error\":\"{error}\"}}")),
        }
    }
}

impl HttpResponse {
    fn to_http(&self) -> String {
        format!(
            "HTTP/1.1 {} {}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
            self.status_code,
            self.status_text,
            self.body.len(),
            self.body
        )
    }
}

fn response(status_code: u16, status_text: &'static str, body: &str) -> HttpResponse {
    HttpResponse {
        status_code,
        status_text,
        body: body.to_string(),
    }
}

fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/healthz", get(health))
        .route("/info", get(info))
        .route("/state", get(state_snapshot))
        .route("/state/app", get(state_snapshot))
        .route("/state/snapshot", get(state_snapshot))
        .route("/workbench/bootstrap", get(state_snapshot))
        .route("/events/replay", get(events_replay))
        .route("/projects", post(project_create))
        .route(
            "/projects/{project_id}/orchestrator",
            post(project_orchestrator),
        )
        .route("/projects/{project_id}/agents", post(project_agent_spawn))
        .route("/projects/{project_id}/events", get(project_events))
        .route(
            "/threads/{thread_id}/artifacts",
            post(thread_artifact_create),
        )
        .route("/threads/{thread_id}/messages", post(thread_message_create))
        .route("/threads/{thread_id}/usage", post(thread_usage_record))
        .route(
            "/threads/{thread_id}/approvals",
            post(thread_approval_create),
        )
        .route("/approvals/{approval_id}/resolve", post(approval_resolve))
        .route(
            "/threads/{thread_id}/processes/register",
            post(thread_process_register),
        )
        .route(
            "/threads/{thread_id}/processes/{process_id}/complete",
            post(thread_process_complete),
        )
        .route("/threads/{thread_id}/decide", post(thread_decide))
        .route("/threads/{thread_id}/archive", post(thread_archive))
        .route("/threads/{thread_id}", delete(thread_archive))
        .route("/orchestrator/spawn-agent", post(orchestrator_spawn_agent))
        .route("/orchestrator/agent-message", post(orchestrator_message))
        .route("/orchestrator/warm-handoff", post(orchestrator_message))
        .route(
            "/orchestrator/archive-agent",
            post(orchestrator_archive_agent),
        )
        .route(
            "/orchestrator/approval-decision",
            post(orchestrator_approval_decision),
        )
        .route("/orchestrator/pending-approvals", get(pending_approvals))
        .route("/orchestrator/lookup", get(state_snapshot))
        .route("/orchestrator/threads", get(state_snapshot))
        .route("/orchestrator/agents", get(state_snapshot))
        .route("/ws", get(ws_events))
        .route("/workbench/ws", get(ws_events))
        .with_state(state)
}

async fn health() -> impl IntoResponse {
    Json(json!({ "status": "ok", "product": "OpenDex" }))
}

async fn info(State(state): State<AppState>) -> impl IntoResponse {
    Json(json!({
        "product": "OpenDex",
        "version": env!("CARGO_PKG_VERSION"),
        "state_path": state.config.state_path.map(|path| path.display().to_string())
    }))
}

async fn state_snapshot(State(state): State<AppState>) -> impl IntoResponse {
    let control_plane = state.control_plane.lock().await;
    Json(json!({ "projects": control_plane.snapshot() }))
}

async fn events_replay(State(state): State<AppState>) -> impl IntoResponse {
    let control_plane = state.control_plane.lock().await;
    Json(json!({ "events": control_plane.replay_all_events() }))
}

async fn project_events(
    State(state): State<AppState>,
    AxumPath(project_id): AxumPath<String>,
) -> impl IntoResponse {
    let control_plane = state.control_plane.lock().await;
    Json(json!({ "events": control_plane.replay_events(&project_id, None) }))
}

async fn project_create(
    State(state): State<AppState>,
    Json(input): Json<ProjectInput>,
) -> impl IntoResponse {
    mutate(state, |control_plane| {
        control_plane.register_project(input)?;
        Ok(())
    })
    .await
}

#[derive(Deserialize)]
struct AttachOrchestratorRequest {
    thread_id: String,
}

async fn project_orchestrator(
    State(state): State<AppState>,
    AxumPath(project_id): AxumPath<String>,
    Json(input): Json<AttachOrchestratorRequest>,
) -> impl IntoResponse {
    mutate(state, |control_plane| {
        control_plane.attach_orchestrator(&project_id, input.thread_id)?;
        Ok(())
    })
    .await
}

#[derive(Deserialize)]
struct SpawnAgentRequest {
    orchestrator_thread_id: String,
    #[serde(flatten)]
    input: SpawnInput,
}

async fn project_agent_spawn(
    State(state): State<AppState>,
    AxumPath(project_id): AxumPath<String>,
    Json(request): Json<SpawnAgentRequest>,
) -> impl IntoResponse {
    spawn_agent(state, &project_id, request).await
}

#[derive(Deserialize)]
struct OrchestratorSpawnRequest {
    project_id: String,
    #[serde(flatten)]
    request: SpawnAgentRequest,
}

async fn orchestrator_spawn_agent(
    State(state): State<AppState>,
    Json(input): Json<OrchestratorSpawnRequest>,
) -> impl IntoResponse {
    spawn_agent(state, &input.project_id, input.request).await
}

async fn spawn_agent(
    state: AppState,
    project_id: &str,
    request: SpawnAgentRequest,
) -> axum::response::Response {
    mutate(state, |control_plane| {
        control_plane.spawn_agent(project_id, &request.orchestrator_thread_id, request.input)?;
        Ok(())
    })
    .await
}

async fn thread_artifact_create(
    State(state): State<AppState>,
    AxumPath(thread_id): AxumPath<String>,
    Json(input): Json<ArtifactInput>,
) -> impl IntoResponse {
    mutate(state, |control_plane| {
        control_plane.record_artifact(&thread_id, input)?;
        Ok(())
    })
    .await
}

async fn thread_message_create(
    State(state): State<AppState>,
    AxumPath(thread_id): AxumPath<String>,
    Json(input): Json<MessageInput>,
) -> impl IntoResponse {
    mutate(state, |control_plane| {
        control_plane.record_message(&thread_id, input)?;
        Ok(())
    })
    .await
}

async fn orchestrator_message(
    State(state): State<AppState>,
    Json(input): Json<OrchestratorMessageRequest>,
) -> impl IntoResponse {
    mutate(state, |control_plane| {
        control_plane.record_message(
            &input.thread_id,
            MessageInput {
                text: input.text,
                final_message: true,
                artifact_ids: input.artifact_ids,
            },
        )?;
        Ok(())
    })
    .await
}

#[derive(Deserialize)]
struct OrchestratorMessageRequest {
    thread_id: String,
    text: String,
    #[serde(default)]
    artifact_ids: Vec<String>,
}

async fn thread_usage_record(
    State(state): State<AppState>,
    AxumPath(thread_id): AxumPath<String>,
    Json(mut input): Json<UsageInput>,
) -> impl IntoResponse {
    input.thread_id = thread_id;
    mutate(state, |control_plane| {
        control_plane.record_usage(input)?;
        Ok(())
    })
    .await
}

async fn thread_approval_create(
    State(state): State<AppState>,
    AxumPath(thread_id): AxumPath<String>,
    Json(mut input): Json<ApprovalInput>,
) -> impl IntoResponse {
    input.thread_id = thread_id;
    mutate(state, |control_plane| {
        control_plane.request_approval(input)?;
        Ok(())
    })
    .await
}

#[derive(Deserialize)]
struct ApprovalDecisionRequest {
    approved: bool,
}

async fn approval_resolve(
    State(state): State<AppState>,
    AxumPath(approval_id): AxumPath<String>,
    Json(input): Json<ApprovalDecisionRequest>,
) -> impl IntoResponse {
    resolve_approval(state, &approval_id, input.approved).await
}

#[derive(Deserialize)]
struct OrchestratorApprovalDecisionRequest {
    approval_id: String,
    approved: bool,
}

async fn orchestrator_approval_decision(
    State(state): State<AppState>,
    Json(input): Json<OrchestratorApprovalDecisionRequest>,
) -> impl IntoResponse {
    resolve_approval(state, &input.approval_id, input.approved).await
}

async fn resolve_approval(
    state: AppState,
    approval_id: &str,
    approved: bool,
) -> axum::response::Response {
    mutate(state, |control_plane| {
        control_plane.resolve_approval(approval_id, approved)?;
        Ok(())
    })
    .await
}

async fn thread_process_register(
    State(state): State<AppState>,
    AxumPath(thread_id): AxumPath<String>,
    Json(mut input): Json<LiveProcessInput>,
) -> impl IntoResponse {
    input.thread_id = thread_id;
    mutate(state, |control_plane| {
        control_plane.register_live_process(input)?;
        Ok(())
    })
    .await
}

async fn thread_process_complete(
    State(state): State<AppState>,
    AxumPath((thread_id, process_id)): AxumPath<(String, String)>,
) -> impl IntoResponse {
    mutate(state, |control_plane| {
        control_plane.complete_live_process(&thread_id, &process_id)?;
        Ok(())
    })
    .await
}

#[derive(Deserialize)]
struct ContinuationRequest {
    orchestrator_thread_id: String,
    #[serde(flatten)]
    input: DecisionInput,
}

async fn thread_decide(
    State(state): State<AppState>,
    AxumPath(thread_id): AxumPath<String>,
    Json(input): Json<ContinuationRequest>,
) -> impl IntoResponse {
    mutate(state, |control_plane| {
        control_plane.decide_continuation(
            &input.orchestrator_thread_id,
            &thread_id,
            input.input,
        )?;
        Ok(())
    })
    .await
}

#[derive(Deserialize)]
struct ArchiveRequest {
    orchestrator_thread_id: String,
}

async fn thread_archive(
    State(state): State<AppState>,
    AxumPath(thread_id): AxumPath<String>,
    Json(input): Json<ArchiveRequest>,
) -> impl IntoResponse {
    archive_agent(state, &input.orchestrator_thread_id, &thread_id).await
}

#[derive(Deserialize)]
struct OrchestratorArchiveRequest {
    orchestrator_thread_id: String,
    thread_id: String,
}

async fn orchestrator_archive_agent(
    State(state): State<AppState>,
    Json(input): Json<OrchestratorArchiveRequest>,
) -> impl IntoResponse {
    archive_agent(state, &input.orchestrator_thread_id, &input.thread_id).await
}

async fn archive_agent(
    state: AppState,
    orchestrator_thread_id: &str,
    thread_id: &str,
) -> axum::response::Response {
    mutate(state, |control_plane| {
        control_plane.archive_agent(orchestrator_thread_id, thread_id)?;
        Ok(())
    })
    .await
}

async fn pending_approvals(State(state): State<AppState>) -> impl IntoResponse {
    let control_plane = state.control_plane.lock().await;
    Json(json!({ "pending_approvals": control_plane.pending_approvals() }))
}

async fn ws_events(State(state): State<AppState>, ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(|socket| async move { send_ws_events(state, socket).await })
}

async fn send_ws_events(state: AppState, mut socket: WebSocket) {
    let events = {
        let control_plane = state.control_plane.lock().await;
        control_plane.replay_all_events()
    };
    if let Ok(text) = serde_json::to_string(&json!({ "events": events })) {
        let _ = socket.send(WsMessage::Text(text.into())).await;
    }
    let _ = socket.send(WsMessage::Close(None)).await;
}

async fn mutate(
    state: AppState,
    action: impl FnOnce(&mut ControlPlane) -> OpenDexResult<()>,
) -> axum::response::Response {
    let mut control_plane = state.control_plane.lock().await;
    match action(&mut control_plane) {
        Ok(()) => {
            let persist_result = match state.config.state_path.clone() {
                Some(path) => FileSnapshotStore::new(path).save(&control_plane),
                None => Ok(()),
            };
            match persist_result {
                Ok(()) => (StatusCode::OK, Json(json!({ "ok": true }))).into_response(),
                Err(error) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("persist failed: {error}") })),
                )
                    .into_response(),
            }
        }
        Err(error) => (
            StatusCode::CONFLICT,
            Json(json!({ "error": error.to_string() })),
        )
            .into_response(),
    }
}

struct Query {
    values: Vec<(String, String)>,
}

impl Query {
    fn from_target(target: &str) -> Self {
        let values = target
            .split_once('?')
            .map(|(_, query)| query)
            .unwrap_or_default()
            .split('&')
            .filter(|part| !part.is_empty())
            .map(|part| {
                let (key, value) = part.split_once('=').unwrap_or((part, ""));
                (decode(key), decode(value))
            })
            .collect();
        Self { values }
    }

    fn optional(&self, key: &str) -> Option<String> {
        self.values
            .iter()
            .find(|(name, _)| name == key)
            .map(|(_, value)| value.clone())
            .filter(|value| !value.is_empty())
    }

    fn string(&self, key: &str, fallback: &str) -> String {
        self.optional(key).unwrap_or_else(|| fallback.to_string())
    }

    fn bool(&self, key: &str, fallback: bool) -> bool {
        self.optional(key)
            .map(|value| matches!(value.as_str(), "true" | "1" | "yes"))
            .unwrap_or(fallback)
    }

    fn u32(&self, key: &str, fallback: u32) -> u32 {
        self.optional(key)
            .and_then(|value| value.parse().ok())
            .unwrap_or(fallback)
    }

    fn u64(&self, key: &str, fallback: u64) -> u64 {
        self.optional(key)
            .and_then(|value| value.parse().ok())
            .unwrap_or(fallback)
    }

    fn u128(&self, key: &str, fallback: u128) -> u128 {
        self.optional(key)
            .and_then(|value| value.parse().ok())
            .unwrap_or(fallback)
    }

    fn list(&self, key: &str) -> Vec<String> {
        self.optional(key)
            .map(|value| {
                value
                    .split(',')
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(ToString::to_string)
                    .collect()
            })
            .unwrap_or_default()
    }

    fn worker_role(&self) -> WorkerRole {
        match self.string("role", "worker").as_str() {
            "qa" | "Qa" | "QA" => WorkerRole::Qa,
            _ => WorkerRole::Worker,
        }
    }

    fn artifact_kind(&self) -> ArtifactKind {
        match self.string("kind", "Log").as_str() {
            "Handoff" | "handoff" => ArtifactKind::Handoff,
            "Diff" | "diff" => ArtifactKind::Diff,
            "Screenshot" | "screenshot" => ArtifactKind::Screenshot,
            "Image" | "image" => ArtifactKind::Image,
            "ReferenceDesign" | "reference_design" => ArtifactKind::ReferenceDesign,
            "Golden" | "golden" => ArtifactKind::Golden,
            _ => ArtifactKind::Log,
        }
    }

    fn decision_kind(&self) -> DecisionKind {
        match self.string("kind", "continue").as_str() {
            "approved" | "Approved" => DecisionKind::Approved,
            "blocked" | "Blocked" => DecisionKind::Blocked,
            _ => DecisionKind::Continue,
        }
    }
}

fn decode(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut bytes = value.as_bytes().iter().copied();
    while let Some(byte) = bytes.next() {
        match byte {
            b'+' => output.push(' '),
            b'%' => {
                let high = bytes.next();
                let low = bytes.next();
                if let (Some(high), Some(low)) = (high, low)
                    && let Ok(hex) = from_utf8(&[high, low])
                    && let Ok(decoded) = u8::from_str_radix(hex, 16)
                {
                    output.push(decoded as char);
                    continue;
                }
                output.push('%');
            }
            value => output.push(value as char),
        }
    }
    output
}
