mod contracts;
mod platform;
mod source_check;

use crate::error::OalError;
use crate::specs::{ProvidersSpec, ToolsSpec};
use crate::validation::ValidationReport;
use serde::de::DeserializeOwned;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum CheckTarget {
    Source,
    Codex,
    Claude,
    OpenCode,
}

impl CheckTarget {
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Source => "source",
            Self::Codex => "codex",
            Self::Claude => "claude",
            Self::OpenCode => "opencode",
        }
    }
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SourceTree {
    root: PathBuf,
}

impl SourceTree {
    #[must_use]
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    /// Checks canonical source files for the selected target.
    ///
    /// # Errors
    ///
    /// Returns an error when required source files cannot be read.
    pub fn check(&self, target: CheckTarget) -> Result<ValidationReport, OalError> {
        let mut report = self.check_source()?;
        match target {
            CheckTarget::Source => {}
            CheckTarget::Codex => {
                report.merge(self.check_platform("codex")?);
            }
            CheckTarget::Claude => {
                report.merge(self.check_platform("claude")?);
            }
            CheckTarget::OpenCode => {
                report.merge(self.check_platform("opencode")?);
            }
        }
        Ok(report)
    }

    /// Reads the provider integration contract.
    ///
    /// # Errors
    ///
    /// Returns an error when `source/providers.toml` cannot be read or parsed.
    pub fn providers(&self) -> Result<ProvidersSpec, OalError> {
        self.read_source_toml("providers.toml")
    }

    /// Reads the tool integration catalog.
    ///
    /// # Errors
    ///
    /// Returns an error when `source/tools.toml` cannot be read or parsed.
    pub fn tools(&self) -> Result<ToolsSpec, OalError> {
        self.read_source_toml("tools.toml")
    }

    pub(super) fn read_source_toml<T>(&self, relative_path: &str) -> Result<T, OalError>
    where
        T: DeserializeOwned,
    {
        let path = self.root.join("source").join(relative_path);
        let source = fs::read_to_string(&path).map_err(|source| OalError::Io {
            path: path.clone(),
            source,
        })?;
        toml::from_str::<T>(&source).map_err(|source| OalError::ParseToml { path, source })
    }
}

/// Returns the current working directory as the repository root.
///
/// # Errors
///
/// Returns an error when the process current directory cannot be read.
pub fn repo_root_from_current_dir() -> Result<PathBuf, OalError> {
    env::current_dir().map_err(|source| OalError::Io {
        path: Path::new(".").to_path_buf(),
        source,
    })
}

#[cfg(test)]
mod tests;
