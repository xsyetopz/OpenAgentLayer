use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct CatalogSpec {
    pub items: Vec<CatalogItem>,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct CatalogItem {
    pub name: String,
    pub kind: String,
    pub route: String,
    pub purpose: String,
    #[serde(default)]
    pub surfaces: Vec<String>,
}
