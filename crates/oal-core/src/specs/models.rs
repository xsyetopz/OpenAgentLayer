use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ModelsSpec {
    pub codex: ModelCatalog,
    pub opencode: ModelCatalog,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ModelCatalog {
    pub models: Vec<ModelSpec>,
    pub routes: Vec<RouteSpec>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ModelSpec {
    pub id: String,
    #[serde(default)]
    pub efforts: Vec<String>,
    #[serde(default)]
    pub fit: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct RouteSpec {
    pub name: String,
    pub default: Option<String>,
    pub fallback: Option<String>,
    #[serde(default)]
    pub order: Vec<String>,
}
