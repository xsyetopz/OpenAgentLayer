use oal_core::specs::{IntegrationsSpec, PackageManagerInstall};
use std::path::Path;

#[derive(Debug, Clone, Eq, PartialEq)]
pub enum PackageClient {
    Bun,
    Npm,
    Pnpm,
    Yarn,
}

pub fn select_package_client_command<'a>(
    repo_root: &Path,
    spec: &'a IntegrationsSpec,
) -> Result<&'a PackageManagerInstall, oal_core::OalError> {
    if let Some(command) = preferred_lockfile_command(repo_root, spec) {
        return Ok(command);
    }
    if let Some(command) = preferred_fallback_command(spec) {
        return Ok(command);
    }
    Err(oal_core::OalError::InvalidArgument {
        argument: "source/integrations.toml has no package manager install commands".to_owned(),
    })
}

pub fn parse_package_client(value: &str) -> Option<PackageClient> {
    match value {
        "bun" => Some(PackageClient::Bun),
        "npm" => Some(PackageClient::Npm),
        "pnpm" => Some(PackageClient::Pnpm),
        "yarn" => Some(PackageClient::Yarn),
        _ => None,
    }
}

fn preferred_lockfile_command<'a>(
    repo_root: &Path,
    spec: &'a IntegrationsSpec,
) -> Option<&'a PackageManagerInstall> {
    spec.package_managers
        .preferred_order
        .iter()
        .find_map(|manager_name| {
            spec.package_managers
                .install_commands
                .iter()
                .find(|entry| entry.name == *manager_name && has_any_lockfile(repo_root, entry))
        })
}

fn preferred_fallback_command(spec: &IntegrationsSpec) -> Option<&PackageManagerInstall> {
    spec.package_managers
        .preferred_order
        .iter()
        .find_map(|manager_name| {
            spec.package_managers
                .install_commands
                .iter()
                .find(|entry| entry.name == *manager_name)
        })
}

fn has_any_lockfile(repo_root: &Path, entry: &PackageManagerInstall) -> bool {
    entry
        .lockfiles
        .iter()
        .any(|lockfile| repo_root.join(lockfile).exists())
}
