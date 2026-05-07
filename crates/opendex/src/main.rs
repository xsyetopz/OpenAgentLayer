use std::env;
use std::path::PathBuf;

use opendex::{ControlPlane, DaemonConfig, OpenDexDaemon};

fn main() {
    let mut args = env::args().skip(1);
    let Some(command) = args.next() else {
        println!("opendex {}", env!("CARGO_PKG_VERSION"));
        return;
    };
    match command.as_str() {
        "--version" | "-V" | "version" => {
            println!("opendex {}", env!("CARGO_PKG_VERSION"));
        }
        "serve" => {
            let mut address = "127.0.0.1:8765".to_string();
            let mut state_path = None;
            let mut request_limit = None;
            while let Some(arg) = args.next() {
                match arg.as_str() {
                    "--addr" => {
                        address = args.next().unwrap_or_else(|| address.clone());
                    }
                    "--state" => {
                        state_path = args.next().map(PathBuf::from);
                    }
                    "--request-limit" => {
                        request_limit = args.next().and_then(|value| value.parse().ok());
                    }
                    _ => {}
                }
            }
            let mut daemon = OpenDexDaemon::new(
                ControlPlane::new(),
                DaemonConfig {
                    state_path,
                    request_limit,
                },
            );
            if let Err(error) = daemon.serve(address) {
                eprintln!("opendex serve failed: {error}");
                std::process::exit(1);
            }
        }
        _ => {
            eprintln!("unknown opendex command: {command}");
            std::process::exit(2);
        }
    }
}
