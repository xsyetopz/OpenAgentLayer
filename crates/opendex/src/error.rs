use std::fmt;

pub type OpenDexResult<T> = Result<T, OpenDexError>;

#[derive(Debug, Eq, PartialEq)]
pub enum OpenDexError {
    ProjectExists(String),
    ProjectNotFound(String),
    OrchestratorMismatch {
        project_id: String,
        thread_id: String,
    },
    MissingOrchestrator(String),
    ThreadExists(String),
    ThreadNotFound(String),
    ArtifactNotOwned {
        thread_id: String,
        artifact_id: String,
    },
    SpawnBlocked(String),
    ApprovalNotFound(String),
    LiveProcessNotFound {
        thread_id: String,
        process_id: String,
    },
}

impl fmt::Display for OpenDexError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ProjectExists(id) => write!(formatter, "OpenDex project exists: {id}"),
            Self::ProjectNotFound(id) => write!(formatter, "OpenDex project not found: {id}"),
            Self::OrchestratorMismatch {
                project_id,
                thread_id,
            } => write!(
                formatter,
                "OpenDex orchestrator mismatch for {project_id}: {thread_id}"
            ),
            Self::MissingOrchestrator(project_id) => {
                write!(
                    formatter,
                    "OpenDex project has no orchestrator: {project_id}"
                )
            }
            Self::ThreadExists(thread_id) => {
                write!(formatter, "OpenDex thread exists: {thread_id}")
            }
            Self::ThreadNotFound(thread_id) => {
                write!(formatter, "OpenDex thread not found: {thread_id}")
            }
            Self::ArtifactNotOwned {
                thread_id,
                artifact_id,
            } => write!(
                formatter,
                "OpenDex artifact is not owned by {thread_id}: {artifact_id}"
            ),
            Self::SpawnBlocked(reason) => write!(formatter, "OpenDex spawn blocked: {reason}"),
            Self::ApprovalNotFound(id) => write!(formatter, "OpenDex approval not found: {id}"),
            Self::LiveProcessNotFound {
                thread_id,
                process_id,
            } => write!(
                formatter,
                "OpenDex live process not found for {thread_id}: {process_id}"
            ),
        }
    }
}

impl std::error::Error for OpenDexError {}
