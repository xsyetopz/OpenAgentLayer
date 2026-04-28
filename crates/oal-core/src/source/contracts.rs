use super::SourceTree;
use crate::error::OalError;
use crate::specs::{ProviderSpec, ProviderSyncMode, ProvidersSpec, ToolSpec, ToolsSpec};
use crate::validation::ValidationReport;

impl SourceTree {
    /// Validates exact upstream provider contracts.
    ///
    /// # Errors
    ///
    /// Returns an error when the provider source file cannot be read or parsed.
    pub fn check_providers(&self) -> Result<ValidationReport, OalError> {
        let spec = self.providers()?;
        let mut report = non_empty_report(
            "source/providers.toml",
            spec.providers.is_empty(),
            "providers must not be empty",
        );

        for provider in &spec.providers {
            require_provider_shape(&mut report, provider);
        }
        require_provider_contracts(&mut report, &spec);
        Ok(report)
    }

    /// Validates the host tool catalog.
    ///
    /// # Errors
    ///
    /// Returns an error when the tool source file cannot be read or parsed.
    pub fn check_tools(&self) -> Result<ValidationReport, OalError> {
        let spec = self.tools()?;
        let mut report = non_empty_report(
            "source/tools.toml",
            spec.tools.is_empty(),
            "tools must not be empty",
        );

        for tool in &spec.tools {
            require_tool_shape(&mut report, tool);
        }
        require_tool_names(&mut report, &spec);
        Ok(report)
    }
}

fn non_empty_report(path: &'static str, empty: bool, message: &'static str) -> ValidationReport {
    let mut report = ValidationReport::new();
    if empty {
        report.error(path, message);
    }
    report
}

fn require_tool_shape(report: &mut ValidationReport, tool: &ToolSpec) {
    let path = "source/tools.toml";
    if tool.name.is_empty() {
        report.error(path, "tool.name must not be empty");
    }
    if tool.purpose.is_empty() {
        report.error(
            path,
            format!("tool `{}` purpose must not be empty", tool.name),
        );
    }
    if tool.probe.is_empty() {
        report.error(
            path,
            format!("tool `{}` probe must not be empty", tool.name),
        );
    }
    if tool.install.default.is_empty() {
        report.error(
            path,
            format!("tool `{}` install.default must not be empty", tool.name),
        );
    }
    if tool.install.macos.is_empty() {
        report.error(
            path,
            format!("tool `{}` install.macos must not be empty", tool.name),
        );
    }
    if tool.install.linux.is_empty() {
        report.error(
            path,
            format!("tool `{}` install.linux must not be empty", tool.name),
        );
    }
    if tool.use_policy.is_empty() {
        report.error(
            path,
            format!("tool `{}` use_policy must not be empty", tool.name),
        );
    }
}

fn require_provider_shape(report: &mut ValidationReport, provider: &ProviderSpec) {
    let path = "source/providers.toml";
    if provider.name.is_empty() {
        report.error(path, "provider.name must not be empty");
    }
    if provider.url.is_empty() {
        report.error(
            path,
            format!("provider `{}` url must not be empty", provider.name),
        );
    }
    if provider.install.default.is_empty() {
        report.error(
            path,
            format!(
                "provider `{}` install.default must not be empty",
                provider.name
            ),
        );
    }
    if provider.sync_mode == ProviderSyncMode::OptionalCli && provider.install.probe.is_empty() {
        report.error(
            path,
            format!("provider `{}` CLI probe must not be empty", provider.name),
        );
    }
    if provider.install.default != "sync-only" && provider.install.default != "sync-extract" {
        require_provider_install_commands(report, provider);
    }
    if provider.provenance.raw_upstream_editable {
        report.error(
            path,
            format!(
                "provider `{}` raw upstream must not be editable",
                provider.name
            ),
        );
    }
    if !provider.provenance.pin_required {
        report.error(
            path,
            format!("provider `{}` must require pinned sync", provider.name),
        );
    }
}

fn require_provider_install_commands(report: &mut ValidationReport, provider: &ProviderSpec) {
    let path = "source/providers.toml";
    if provider.install.macos.is_empty() {
        report.error(
            path,
            format!(
                "provider `{}` install.macos must not be empty",
                provider.name
            ),
        );
    }
    if provider.install.linux.is_empty() {
        report.error(
            path,
            format!(
                "provider `{}` install.linux must not be empty",
                provider.name
            ),
        );
    }
}

fn require_provider_contracts(report: &mut ValidationReport, spec: &ProvidersSpec) {
    for contract in provider_contracts() {
        require_provider_url(report, spec, contract.name, contract.url);
        require_provider_mode(report, spec, contract.name, contract.mode);
        if contract.optional {
            require_optional_not_required(report, spec, contract.name);
        }
    }
}

#[derive(Clone, Copy)]
struct ProviderContract {
    name: &'static str,
    url: &'static str,
    mode: ProviderSyncMode,
    optional: bool,
}

const fn provider_contracts() -> [ProviderContract; 7] {
    [
        ProviderContract {
            name: "caveman",
            url: "https://github.com/juliusbrussee/caveman",
            mode: ProviderSyncMode::ExactUpstream,
            optional: false,
        },
        ProviderContract {
            name: "bmad-method",
            url: "https://github.com/bmad-code-org/BMAD-METHOD",
            mode: ProviderSyncMode::UpstreamExtraction,
            optional: false,
        },
        ProviderContract {
            name: "taste-skill",
            url: "https://github.com/leonxlnx/taste-skill",
            mode: ProviderSyncMode::ExactUpstream,
            optional: false,
        },
        ProviderContract {
            name: "rtk",
            url: "https://github.com/rtk-ai/rtk",
            mode: ProviderSyncMode::ExactUpstream,
            optional: false,
        },
        ProviderContract {
            name: "context7",
            url: "https://github.com/upstash/context7",
            mode: ProviderSyncMode::OptionalCli,
            optional: true,
        },
        ProviderContract {
            name: "playwright-cli",
            url: "https://github.com/microsoft/playwright-cli",
            mode: ProviderSyncMode::OptionalCli,
            optional: true,
        },
        ProviderContract {
            name: "deepwiki",
            url: "https://www.deepwiki.sh/",
            mode: ProviderSyncMode::OptionalCli,
            optional: true,
        },
    ]
}

fn require_provider_url(
    report: &mut ValidationReport,
    spec: &ProvidersSpec,
    name: &str,
    expected_url: &str,
) {
    match spec.providers.iter().find(|provider| provider.name == name) {
        None => report.error(
            "source/providers.toml",
            format!("missing provider `{name}`"),
        ),
        Some(provider) if provider.url != expected_url => report.error(
            "source/providers.toml",
            format!(
                "provider `{name}` url expected `{expected_url}`, got `{}`",
                provider.url
            ),
        ),
        Some(_) => {}
    }
}

fn require_provider_mode(
    report: &mut ValidationReport,
    spec: &ProvidersSpec,
    name: &str,
    expected_mode: ProviderSyncMode,
) {
    if let Some(provider) = spec.providers.iter().find(|provider| provider.name == name)
        && provider.sync_mode != expected_mode
    {
        report.error(
            "source/providers.toml",
            format!(
                "provider `{name}` sync_mode expected `{expected_mode:?}`, got `{:?}`",
                provider.sync_mode
            ),
        );
    }
}

fn require_optional_not_required(report: &mut ValidationReport, spec: &ProvidersSpec, name: &str) {
    if let Some(provider) = spec.providers.iter().find(|provider| provider.name == name)
        && provider.required
    {
        report.error(
            "source/providers.toml",
            format!("provider `{name}` must set required = false"),
        );
    }
}

fn require_tool_names(report: &mut ValidationReport, spec: &ToolsSpec) {
    for name in [
        "homebrew",
        "rust",
        "node",
        "bun",
        "rtk",
        "ripgrep",
        "fd",
        "ast-grep",
        "repomix",
        "gh",
        "jq",
        "just",
        "mise",
        "uv",
        "ruff",
        "hyperfine",
        "act",
        "eza",
        "bat",
        "gum",
        "context7",
        "playwright-cli",
    ] {
        if !spec.tools.iter().any(|tool| tool.name == name) {
            report_missing_tool(report, name);
        }
    }
}

fn report_missing_tool(report: &mut ValidationReport, name: &str) {
    report.error("source/tools.toml", format!("missing tool `{name}`"));
}
