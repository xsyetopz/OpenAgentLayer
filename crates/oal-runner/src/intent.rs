use std::fs::read_to_string;
use std::process::Command;

use crate::CommandSummary;

#[must_use]
pub fn run_intent(kind: &str, args: &[String]) -> CommandSummary {
    match kind {
        "status" => run_native("git", &["status", "--short", "--branch"]),
        "diff" => run_native("git", &["diff", "--stat"]),
        "list" => run_native("ls", &["-la"]),
        "read" => read_file(args.first()),
        "search" => search(args),
        unknown => CommandSummary::new(unknown.to_owned(), false, "unsupported intent".to_owned()),
    }
}

fn run_native(program: &str, args: &[&str]) -> CommandSummary {
    match Command::new(program).args(args).output() {
        Ok(output) => CommandSummary::new(
            program.to_owned(),
            output.status.success(),
            String::from_utf8_lossy(if output.status.success() {
                &output.stdout
            } else {
                &output.stderr
            })
            .trim()
            .to_owned(),
        ),
        Err(error) => CommandSummary::new(program.to_owned(), false, error.to_string()),
    }
}

fn read_file(path: Option<&String>) -> CommandSummary {
    path.map_or_else(
        || CommandSummary::new("read".to_owned(), false, "missing path".to_owned()),
        |path| match read_to_string(path) {
            Ok(contents) => CommandSummary::new(
                "read".to_owned(),
                true,
                contents.lines().take(120).collect::<Vec<_>>().join("\n"),
            ),
            Err(error) => CommandSummary::new("read".to_owned(), false, error.to_string()),
        },
    )
}

fn search(args: &[String]) -> CommandSummary {
    if args.is_empty() {
        return CommandSummary::new("search".to_owned(), false, "missing pattern".to_owned());
    }
    let output = Command::new("rg").arg(&args[0]).output();
    match output {
        Ok(output) => CommandSummary::new(
            "search".to_owned(),
            output.status.success(),
            String::from_utf8_lossy(&output.stdout)
                .lines()
                .take(80)
                .collect::<Vec<_>>()
                .join("\n"),
        ),
        Err(error) => CommandSummary::new("search".to_owned(), false, error.to_string()),
    }
}

#[cfg(test)]
mod tests;
