pub mod error;
pub mod product;
pub mod source;
pub mod specs;
pub mod validation;

pub use error::OalError;
pub use source::{CheckTarget, SourceTree, repo_root_from_current_dir};
pub use validation::{Severity, ValidationFinding, ValidationReport};
