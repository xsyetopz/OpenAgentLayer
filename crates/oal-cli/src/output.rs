use oal_core::product::{CLI_NAME, PRODUCT_NAME};
use oal_core::specs::{ProviderSpec, ToolSpec};
use oal_core::{Severity, ValidationReport};

pub fn print_findings(report: &ValidationReport) {
    for finding in report.findings() {
        let severity = match finding.severity {
            Severity::Error => "error",
            Severity::Warning => "warning",
        };
        println!("{severity}: {}: {}", finding.path, finding.message);
    }
}

pub fn print_help() {
    println!("{PRODUCT_NAME}");
    println!("Usage:");
    println!("  {CLI_NAME} --version");
    println!("  {CLI_NAME} check [source|codex|claude|opencode]");
    println!("  {CLI_NAME} check hooks [codex|claude|opencode]");
    println!("  {CLI_NAME} doctor [providers]");
    println!("  {CLI_NAME} doctor hooks [codex|claude|opencode]");
    println!("  {CLI_NAME} provider list");
    println!("  {CLI_NAME} provider check");
    println!("  {CLI_NAME} tool list");
}

pub fn print_provider(provider: &ProviderSpec) {
    println!(
        "{} required={} sync_mode={:?} url={}",
        provider.name, provider.required, provider.sync_mode, provider.url
    );
}

pub fn print_tool(tool: &ToolSpec) {
    println!(
        "{} required={} probe={:?} use_policy={}",
        tool.name, tool.required, tool.probe, tool.use_policy
    );
}
