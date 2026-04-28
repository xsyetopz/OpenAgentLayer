use super::CommandPlan;
use crate::{CommandRisk, FilterBackend, PackageClient};
use std::path::PathBuf;

#[test]
fn plans_rtk_supported_git_command() {
    let command = CommandPlan::simple("git", vec!["status".to_owned()]);
    assert_eq!(FilterBackend::Rtk, command.backend);
    assert_eq!(CommandRisk::Normal, command.risk);
}

#[test]
fn marks_git_reset_destructive() {
    let command = CommandPlan::simple("git", vec!["reset".to_owned()]);
    assert_eq!(CommandRisk::Destructive, command.risk);
}

#[test]
fn builds_package_install_plan_from_source() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..");
    let plan =
        CommandPlan::package_install_from_source(&root).expect("source integrations should parse");
    assert_eq!("bun", plan.program);
    assert_eq!(Some(PackageClient::Bun), plan.package_manager);
}
