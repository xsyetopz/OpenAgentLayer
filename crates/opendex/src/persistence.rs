use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::control_plane::ControlPlane;
use crate::types::Project;
use serde::{Deserialize, Serialize};

pub trait SnapshotStore {
    fn save(&self, control_plane: &ControlPlane) -> io::Result<()>;
    fn load(&self) -> io::Result<Option<ControlPlane>>;
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FileSnapshotStore {
    path: PathBuf,
}

impl FileSnapshotStore {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

impl SnapshotStore for FileSnapshotStore {
    fn save(&self, control_plane: &ControlPlane) -> io::Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let snapshot = Snapshot {
            schema: SNAPSHOT_SCHEMA.to_string(),
            state: SnapshotState {
                projects: control_plane.snapshot(),
            },
        };
        let json = serde_json::to_string_pretty(&snapshot).map_err(io::Error::other)?;
        fs::write(&self.path, json)
    }

    fn load(&self) -> io::Result<Option<ControlPlane>> {
        match fs::read_to_string(&self.path) {
            Ok(value) => {
                let snapshot: Snapshot = serde_json::from_str(&value).map_err(io::Error::other)?;
                if snapshot.schema != SNAPSHOT_SCHEMA {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        format!("unsupported OpenDex snapshot schema: {}", snapshot.schema),
                    ));
                }
                Ok(Some(ControlPlane::from_projects(snapshot.state.projects)))
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error),
        }
    }
}

const SNAPSHOT_SCHEMA: &str = "opendex.snapshot.v1";

#[derive(Deserialize, Serialize)]
struct Snapshot {
    schema: String,
    state: SnapshotState,
}

#[derive(Deserialize, Serialize)]
struct SnapshotState {
    projects: Vec<Project>,
}
