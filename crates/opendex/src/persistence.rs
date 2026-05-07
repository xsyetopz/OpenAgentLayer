use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::control_plane::ControlPlane;
use crate::json::snapshot_json;

pub trait SnapshotStore {
    fn save(&self, control_plane: &ControlPlane) -> io::Result<()>;
    fn load_raw(&self) -> io::Result<Option<String>>;
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
        let snapshot = snapshot_json(&control_plane.snapshot());
        fs::write(&self.path, snapshot)
    }

    fn load_raw(&self) -> io::Result<Option<String>> {
        match fs::read_to_string(&self.path) {
            Ok(value) => Ok(Some(value)),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error),
        }
    }
}
