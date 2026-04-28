use crate::backend::{FilterBackend, select_backend};
use crate::package::{PackageClient, parse_package_client, select_package_client_command};
use crate::risk::{CommandRisk, classify_risk};
use oal_core::specs::IntegrationsSpec;
use std::fs::read_to_string;
use std::path::Path;

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct CommandPlan {
    pub program: String,
    pub arguments: Vec<String>,
    pub risk: CommandRisk,
    pub backend: FilterBackend,
    pub package_manager: Option<PackageClient>,
    pub rtk_capabilities: Vec<String>,
}

impl CommandPlan {
    #[must_use]
    pub fn simple(program: impl Into<String>, arguments: Vec<String>) -> Self {
        let program = program.into();
        let risk = classify_risk(&program, &arguments);
        let backend = select_backend(&program);
        let package_manager = parse_package_client(&program);
        Self {
            program,
            arguments,
            risk,
            backend,
            package_manager,
            rtk_capabilities: vec!["rewrite".to_owned(), "filter-selection".to_owned()],
        }
    }

    /// Loads source spec and returns package-install plan with RTK capability tags.
    ///
    /// # Errors
    ///
    /// Returns an error when source spec is missing or invalid TOML.
    pub fn package_install_from_source(repo_root: &Path) -> Result<Self, oal_core::OalError> {
        let spec = read_integrations(repo_root)?;
        let command = select_package_client_command(repo_root, &spec)?;
        let Some((program, argument_slice)) = command.command.split_first() else {
            return Err(oal_core::OalError::InvalidArgument {
                argument: format!("empty package manager command for `{}`", command.name),
            });
        };
        Ok(Self {
            program: program.clone(),
            arguments: argument_slice.to_vec(),
            risk: classify_risk(program, &[]),
            backend: select_backend(program),
            package_manager: parse_package_client(command.name.as_str()),
            rtk_capabilities: spec.capabilities.rtk,
        })
    }
}

fn read_integrations(repo_root: &Path) -> Result<IntegrationsSpec, oal_core::OalError> {
    let path = repo_root.join("source").join("integrations.toml");
    let source = read_to_string(&path).map_err(|source| oal_core::OalError::Io {
        path: path.clone(),
        source,
    })?;
    toml::from_str(&source).map_err(|source| oal_core::OalError::ParseToml { path, source })
}

#[cfg(test)]
mod tests;
