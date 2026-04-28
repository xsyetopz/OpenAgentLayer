use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ProductSpec {
    pub product: Product,
    pub support: Support,
    pub docs: ProductDocs,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct Product {
    pub name: String,
    pub short_name: String,
    pub cli: String,
    pub runner: String,
    pub tagline: String,
    pub version: String,
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct Support {
    pub macos: bool,
    pub linux: bool,
    pub wsl2_linux: bool,
    pub windows_native: bool,
    pub windows_native_error: String,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct ProductDocs {
    pub planning: String,
    pub architecture: String,
    pub runtime: String,
}
