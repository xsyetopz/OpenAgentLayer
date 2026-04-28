use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct PlatformSpec {
    pub name: String,
    pub references: Vec<String>,
    pub native_surfaces: NativeSurfaces,
    pub adapter_plan: AdapterPlan,
    #[serde(default)]
    pub hook_events: Vec<HookEventSpec>,
    pub validation: ValidationSpec,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct NativeSurfaces {
    pub config: Option<String>,
    pub rules: Option<String>,
    pub agents: Option<String>,
    pub skills: Option<String>,
    pub commands: Option<String>,
    pub hooks: Option<String>,
    pub permissions: Option<String>,
    pub mcp: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct AdapterPlan {
    pub primary: bool,
    pub generated_paths: Vec<String>,
    pub install_paths: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct HookEventSpec {
    pub name: String,
    pub native_event: String,
    pub supported: bool,
    pub payload: String,
    pub output: String,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ValidationSpec {
    pub checks: Vec<String>,
}
