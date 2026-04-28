use std::error::Error;
use std::fmt::{Display, Formatter, Result as FormatResult};
use std::io;
use std::path::PathBuf;
use toml::de::Error as TomlError;

#[derive(Debug)]
pub enum OalError {
    Io { path: PathBuf, source: io::Error },
    ParseToml { path: PathBuf, source: TomlError },
    InvalidArgument { argument: String },
    ValidationFailed { target: String, failures: usize },
}

impl Display for OalError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> FormatResult {
        match self {
            Self::Io { path, source } => {
                write!(formatter, "{}: {}", path.display(), source)
            }
            Self::ParseToml { path, source } => {
                write!(formatter, "{}: {}", path.display(), source)
            }
            Self::InvalidArgument { argument } => {
                write!(formatter, "unknown command: {argument}")
            }
            Self::ValidationFailed { target, failures } => {
                write!(
                    formatter,
                    "{target} check failed with {failures} failure(s)"
                )
            }
        }
    }
}

impl Error for OalError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Io { source, .. } => Some(source),
            Self::ParseToml { source, .. } => Some(source),
            Self::InvalidArgument { .. } | Self::ValidationFailed { .. } => None,
        }
    }
}
