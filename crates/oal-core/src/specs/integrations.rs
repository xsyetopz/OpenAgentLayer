use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct IntegrationsSpec {
    pub package_managers: PackageManagers,
    pub capabilities: RunnerCapabilities,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct PackageManagers {
    pub preferred_order: Vec<String>,
    pub selection: String,
    pub never_coerce: bool,
    pub install_commands: Vec<PackageManagerInstall>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct PackageManagerInstall {
    pub name: String,
    pub command: Vec<String>,
    pub lockfiles: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct RunnerCapabilities {
    pub rtk: Vec<String>,
    pub context7: Vec<String>,
    pub caveman: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ProvidersSpec {
    pub providers: Vec<ProviderSpec>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ProviderSpec {
    pub name: String,
    pub url: String,
    pub required: bool,
    pub sync_mode: ProviderSyncMode,
    pub install: ProviderInstall,
    pub provenance: ProviderProvenance,
}

#[derive(Debug, Clone, Copy, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderSyncMode {
    ExactUpstream,
    UpstreamExtraction,
    OptionalCli,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ProviderInstall {
    pub default: String,
    pub macos: Vec<String>,
    pub linux: Vec<String>,
    pub probe: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ProviderProvenance {
    pub upstream_path: String,
    pub overlay_path: String,
    pub raw_upstream_editable: bool,
    pub pin_required: bool,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ToolsSpec {
    pub tools: Vec<ToolSpec>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ToolSpec {
    pub name: String,
    pub purpose: String,
    pub required: bool,
    pub probe: Vec<String>,
    pub install: ToolInstall,
    pub use_policy: String,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ToolInstall {
    pub default: String,
    pub macos: Vec<String>,
    pub linux: Vec<String>,
}
