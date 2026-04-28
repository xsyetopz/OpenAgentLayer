use crate::args::{Command, DoctorScope, HookPlatform, parse_command};
use crate::output::{print_findings, print_help, print_provider, print_tool};
use oal_core::product::{CLI_NAME, runtime_target};
use oal_core::{CheckTarget, OalError, SourceTree, repo_root_from_current_dir};
use oal_runner::CommandPlan;
use std::path::Path;

pub fn run(arguments: impl Iterator<Item = String>) -> Result<(), OalError> {
    match parse_command(arguments)? {
        Command::Version => {
            println!(
                "{CLI_NAME} {} ({})",
                env!("CARGO_PKG_VERSION"),
                runtime_target()
            );
            Ok(())
        }
        Command::Help => {
            print_help();
            Ok(())
        }
        Command::Check(target) => run_check(target),
        Command::CheckHooks(platform) => run_check_hooks(platform),
        Command::Doctor(scope) => run_doctor(scope),
        Command::ProviderList => run_provider_list(),
        Command::ProviderCheck => run_provider_check(),
        Command::ToolList => run_tool_list(),
    }
}

fn run_check(target: CheckTarget) -> Result<(), OalError> {
    let root = repo_root_from_current_dir()?;
    let report = SourceTree::new(root).check(target)?;
    print_findings(&report);
    if report.is_success() {
        println!("{} check passed", target.name());
        Ok(())
    } else {
        Err(OalError::ValidationFailed {
            target: target.name().to_owned(),
            failures: report.failure_count(),
        })
    }
}

fn run_check_hooks(platform: HookPlatform) -> Result<(), OalError> {
    let root = repo_root_from_current_dir()?;
    let platform_name = platform.name();
    let report = SourceTree::new(root).check_hooks(platform_name)?;
    print_findings(&report);
    if report.is_success() {
        println!("{platform_name} hooks check passed");
        Ok(())
    } else {
        Err(OalError::ValidationFailed {
            target: format!("hooks {platform_name}"),
            failures: report.failure_count(),
        })
    }
}

fn run_doctor(scope: DoctorScope) -> Result<(), OalError> {
    let root = repo_root_from_current_dir()?;
    let source = SourceTree::new(root.clone());
    match scope {
        DoctorScope::All => run_doctor_all(&source, &root),
        DoctorScope::Providers => run_doctor_providers(&source),
        DoctorScope::Hooks(platform) => run_doctor_hooks(&source, platform),
    }
}

fn run_doctor_all(source: &SourceTree, root: &Path) -> Result<(), OalError> {
    let report = source.check(CheckTarget::Source)?;
    if !report.is_success() {
        return Err(OalError::ValidationFailed {
            target: "source".to_owned(),
            failures: report.failure_count(),
        });
    }
    let plan = CommandPlan::package_install_from_source(root)?;
    println!("doctor: source parse ok");
    println!(
        "doctor: package manager command {} {:?}",
        plan.program, plan.arguments
    );
    println!("doctor: rtk capabilities {:?}", plan.rtk_capabilities);
    Ok(())
}

fn run_doctor_providers(source: &SourceTree) -> Result<(), OalError> {
    let report = source.check_providers()?;
    print_findings(&report);
    if !report.is_success() {
        return Err(OalError::ValidationFailed {
            target: "providers".to_owned(),
            failures: report.failure_count(),
        });
    }
    println!("doctor: providers check passed");
    for provider in source.providers()?.providers {
        println!(
            "doctor: provider {} probe {:?}",
            provider.name, provider.install.probe
        );
    }
    Ok(())
}

fn run_doctor_hooks(source: &SourceTree, platform: HookPlatform) -> Result<(), OalError> {
    let platform_name = platform.name();
    let report = source.check_hooks(platform_name)?;
    print_findings(&report);
    if !report.is_success() {
        return Err(OalError::ValidationFailed {
            target: format!("hooks {platform_name}"),
            failures: report.failure_count(),
        });
    }
    println!("doctor: {platform_name} hooks check passed");
    Ok(())
}

fn run_provider_list() -> Result<(), OalError> {
    let root = repo_root_from_current_dir()?;
    for provider in SourceTree::new(root).providers()?.providers {
        print_provider(&provider);
    }
    Ok(())
}

fn run_provider_check() -> Result<(), OalError> {
    let root = repo_root_from_current_dir()?;
    let report = SourceTree::new(root).check_providers()?;
    print_findings(&report);
    if report.is_success() {
        println!("providers check passed");
        Ok(())
    } else {
        Err(OalError::ValidationFailed {
            target: "providers".to_owned(),
            failures: report.failure_count(),
        })
    }
}

fn run_tool_list() -> Result<(), OalError> {
    let root = repo_root_from_current_dir()?;
    for tool in SourceTree::new(root).tools()?.tools {
        print_tool(&tool);
    }
    Ok(())
}
