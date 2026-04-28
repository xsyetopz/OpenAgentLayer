use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct RunnerSpec {
    pub command_policy: CommandPolicy,
    pub rtk: RtkSpec,
    pub token_accounting: TokenAccounting,
    pub filters: RunnerFilters,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct CommandPolicy {
    pub parse_shell_chains: bool,
    pub preserve_shell_semantics: bool,
    pub destructive_commands_require_approval: bool,
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct RtkSpec {
    pub probe_path: bool,
    pub probe_version: bool,
    pub probe_filters: bool,
    pub detect_recursion: bool,
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct TokenAccounting {
    pub track_raw_tokens: bool,
    pub track_kept_tokens: bool,
    pub track_saved_tokens: bool,
    pub track_unsupported_commands: bool,
    pub track_low_yield_commands: bool,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq)]
pub struct RunnerFilters {
    pub high_yield: Vec<String>,
    pub fallback: String,
}
