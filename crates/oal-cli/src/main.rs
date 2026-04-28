mod args;
mod output;
mod run;

use std::env;
use std::process::ExitCode;

fn main() -> ExitCode {
    match run::run(env::args().skip(1)) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}
