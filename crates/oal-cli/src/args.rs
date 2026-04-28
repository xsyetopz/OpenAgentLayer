use oal_core::{CheckTarget, OalError};

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum DoctorScope {
    All,
    Providers,
    Hooks(HookPlatform),
}

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum HookPlatform {
    Codex,
    Claude,
    OpenCode,
}

impl HookPlatform {
    pub const fn name(self) -> &'static str {
        match self {
            Self::Codex => "codex",
            Self::Claude => "claude",
            Self::OpenCode => "opencode",
        }
    }
}

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum Command {
    Version,
    Help,
    Check(CheckTarget),
    CheckHooks(HookPlatform),
    Doctor(DoctorScope),
    ProviderList,
    ProviderCheck,
    ToolList,
}

pub fn parse_command(mut arguments: impl Iterator<Item = String>) -> Result<Command, OalError> {
    let first = arguments.next();
    match first.as_deref() {
        None | Some("--version" | "-V") => Ok(Command::Version),
        Some("check") => parse_check_command(&mut arguments),
        Some("doctor") => Ok(Command::Doctor(parse_doctor_scope(&mut arguments)?)),
        Some("provider") => parse_provider_command(&mut arguments),
        Some("tool") => parse_tool_command(&mut arguments),
        Some("--help" | "-h") => Ok(Command::Help),
        Some(other) => Err(OalError::InvalidArgument {
            argument: other.to_owned(),
        }),
    }
}

fn parse_check_command(arguments: &mut impl Iterator<Item = String>) -> Result<Command, OalError> {
    match arguments.next().as_deref() {
        None | Some("source") => Ok(Command::Check(CheckTarget::Source)),
        Some("codex") => Ok(Command::Check(CheckTarget::Codex)),
        Some("claude") => Ok(Command::Check(CheckTarget::Claude)),
        Some("opencode") => Ok(Command::Check(CheckTarget::OpenCode)),
        Some("hooks") => Ok(Command::CheckHooks(parse_hook_platform(arguments)?)),
        Some("claude-code") => Err(OalError::InvalidArgument {
            argument: "check claude-code (use `claude`)".to_owned(),
        }),
        Some("codex-cli") => Err(OalError::InvalidArgument {
            argument: "check codex-cli (use `codex`)".to_owned(),
        }),
        Some(other) => Err(OalError::InvalidArgument {
            argument: format!("check {other}"),
        }),
    }
}

fn parse_doctor_scope(
    arguments: &mut impl Iterator<Item = String>,
) -> Result<DoctorScope, OalError> {
    match arguments.next().as_deref() {
        None => Ok(DoctorScope::All),
        Some("providers") => Ok(DoctorScope::Providers),
        Some("hooks") => Ok(DoctorScope::Hooks(parse_hook_platform(arguments)?)),
        Some(other) => Err(OalError::InvalidArgument {
            argument: format!("doctor {other}"),
        }),
    }
}

fn parse_hook_platform(
    arguments: &mut impl Iterator<Item = String>,
) -> Result<HookPlatform, OalError> {
    match arguments.next().as_deref() {
        Some("codex") => Ok(HookPlatform::Codex),
        Some("claude") => Ok(HookPlatform::Claude),
        Some("opencode") => Ok(HookPlatform::OpenCode),
        Some("claude-code") => Err(OalError::InvalidArgument {
            argument: "hooks claude-code (use `claude`)".to_owned(),
        }),
        Some("codex-cli") => Err(OalError::InvalidArgument {
            argument: "hooks codex-cli (use `codex`)".to_owned(),
        }),
        Some(other) => Err(OalError::InvalidArgument {
            argument: format!("hooks {other}"),
        }),
        None => Err(OalError::InvalidArgument {
            argument: "hooks".to_owned(),
        }),
    }
}

fn parse_provider_command(
    arguments: &mut impl Iterator<Item = String>,
) -> Result<Command, OalError> {
    match arguments.next().as_deref() {
        Some("list") => Ok(Command::ProviderList),
        Some("check") => Ok(Command::ProviderCheck),
        Some(other) => Err(OalError::InvalidArgument {
            argument: format!("provider {other}"),
        }),
        None => Err(OalError::InvalidArgument {
            argument: "provider".to_owned(),
        }),
    }
}

fn parse_tool_command(arguments: &mut impl Iterator<Item = String>) -> Result<Command, OalError> {
    match arguments.next().as_deref() {
        Some("list") => Ok(Command::ToolList),
        Some(other) => Err(OalError::InvalidArgument {
            argument: format!("tool {other}"),
        }),
        None => Err(OalError::InvalidArgument {
            argument: "tool".to_owned(),
        }),
    }
}

#[cfg(test)]
mod tests;
