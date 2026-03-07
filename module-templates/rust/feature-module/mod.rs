//! # {Feature} Module
//!
//! {Brief description of what this feature does}
//!
//! ## Usage
//!
//! ```rust
//! use crate::{feature}::{MainType, {Feature}Service};
//!
//! let service = {Feature}Service::new(config);
//! let result = service.do_something(input)?;
//! ```

// =============================================================================
// PUBLIC EXPORTS
// =============================================================================

mod types;
mod service;

pub use types::{MainType, Config, Error};
pub use service::{Feature}Service;

// Re-export commonly used items
pub type Result<T> = std::result::Result<T, Error>;

// =============================================================================
// TESTS (if inline)
// =============================================================================

#[cfg(test)]
mod tests;
