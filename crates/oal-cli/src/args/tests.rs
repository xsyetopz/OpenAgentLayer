use super::{Command, DoctorScope, HookPlatform, parse_command};
use oal_core::CheckTarget;

#[test]
fn parses_check_targets() {
    assert_eq!(
        Command::Check(CheckTarget::Codex),
        parse(["check", "codex"])
    );
    assert_eq!(
        Command::Check(CheckTarget::Claude),
        parse(["check", "claude"])
    );
    assert_eq!(
        Command::Check(CheckTarget::OpenCode),
        parse(["check", "opencode"])
    );
}

#[test]
fn parses_check_hooks_claude() {
    assert_eq!(
        Command::CheckHooks(HookPlatform::Claude),
        parse(["check", "hooks", "claude"])
    );
}

#[test]
fn parses_doctor_hooks_codex() {
    assert_eq!(
        Command::Doctor(DoctorScope::Hooks(HookPlatform::Codex)),
        parse(["doctor", "hooks", "codex"]),
    );
}

#[test]
fn rejects_claude_code_alias() {
    let error = parse_command(
        ["doctor", "hooks", "claude-code"]
            .into_iter()
            .map(str::to_owned),
    )
    .expect_err("claude-code alias must be rejected");
    assert!(error.to_string().contains("use `claude`"));
}

#[test]
fn rejects_codex_cli_alias() {
    let error = parse_command(
        ["check", "hooks", "codex-cli"]
            .into_iter()
            .map(str::to_owned),
    )
    .expect_err("codex-cli alias must be rejected");
    assert!(error.to_string().contains("use `codex`"));
}

#[test]
fn parses_provider_check() {
    assert_eq!(Command::ProviderCheck, parse(["provider", "check"]));
}

#[test]
fn parses_doctor_providers() {
    assert_eq!(
        Command::Doctor(DoctorScope::Providers),
        parse(["doctor", "providers"])
    );
}

fn parse<const N: usize>(arguments: [&str; N]) -> Command {
    parse_command(arguments.into_iter().map(str::to_owned)).expect("command should parse")
}
