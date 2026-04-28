use clap::Parser;
use oal_runner::run_intent;

#[derive(Parser)]
#[command(name = "oal-runner", about = "OpenAgentLayer command runner")]
struct Cli {
    #[arg(default_value = "status")]
    intent: String,
    #[arg(trailing_var_arg = true)]
    args: Vec<String>,
}

fn main() {
    let cli = Cli::parse();
    println!("{}", run_intent(&cli.intent, &cli.args).to_json());
}
