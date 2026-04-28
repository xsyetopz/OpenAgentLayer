mod backend;
mod package;
mod plan;
mod risk;

use oal_core::product::RUNNER_NAME;

pub use backend::FilterBackend;
pub use package::PackageClient;
pub use plan::CommandPlan;
pub use risk::CommandRisk;

#[must_use]
pub const fn runner_name() -> &'static str {
    RUNNER_NAME
}
