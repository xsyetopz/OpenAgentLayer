#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum CommandRisk {
    Normal,
    Destructive,
}

pub fn classify_risk(program: &str, arguments: &[String]) -> CommandRisk {
    if program == "rm" || program == "git" && has_argument(arguments, "reset") {
        CommandRisk::Destructive
    } else {
        CommandRisk::Normal
    }
}

fn has_argument(arguments: &[String], expected: &str) -> bool {
    arguments
        .iter()
        .any(|argument| argument.as_str() == expected)
}
