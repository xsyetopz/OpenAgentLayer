use std::io::{self, Read, Write};
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
use std::time::Duration;

use crate::control_plane::ControlPlane;
use crate::json::{events_json, projects_json};
use crate::persistence::{FileSnapshotStore, SnapshotStore};
use crate::{
    ApprovalInput, ArtifactInput, ArtifactKind, DecisionInput, DecisionKind, LiveProcessInput,
    MessageInput, ProjectInput, SpawnInput, UsageInput, WorkerRole,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DaemonConfig {
    pub state_path: Option<std::path::PathBuf>,
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
                    && let Ok(hex) = std::str::from_utf8(&[high, low])
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
