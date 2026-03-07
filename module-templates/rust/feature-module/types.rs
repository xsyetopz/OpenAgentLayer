//! Domain types for {Feature}
//!
//! This file contains pure data structures with no business logic.
//! All types here should be self-contained and serializable.

use serde::{Deserialize, Serialize};
use std::fmt;

// =============================================================================
// SECTION 1: CONFIGURATION
// =============================================================================

/// Configuration for {Feature}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// {Description of field}
    pub field_one: String,

    /// {Description of field}
    #[serde(default = "default_field_two")]
    pub field_two: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            field_one: String::new(),
            field_two: default_field_two(),
        }
    }
}

fn default_field_two() -> u64 {
    3600
}

// =============================================================================
// SECTION 2: DOMAIN TYPES
// =============================================================================

/// Main domain type for {Feature}
///
/// # Example
///
/// ```rust
/// let item = MainType::new("example");
/// assert!(!item.id.is_empty());
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MainType {
    /// Unique identifier
    pub id: String,

    /// {Description}
    pub data: String,

    /// Creation timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl MainType {
    /// Creates a new instance
    pub fn new(data: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            data: data.into(),
            created_at: chrono::Utc::now(),
        }
    }
}

// =============================================================================
// SECTION 3: TRAIT IMPLEMENTATIONS
// =============================================================================

impl fmt::Display for MainType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "MainType({})", self.id)
    }
}

// =============================================================================
// SECTION 4: ERRORS
// =============================================================================

/// Errors that can occur in {Feature}
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// Item was not found
    #[error("not found: {0}")]
    NotFound(String),

    /// Invalid input provided
    #[error("invalid input: {0}")]
    InvalidInput(String),

    /// Internal error
    #[error("internal error: {0}")]
    Internal(String),
}

// =============================================================================
// SECTION 5: TYPE ALIASES
// =============================================================================

/// Result type alias for this module
pub type Result<T> = std::result::Result<T, Error>;
