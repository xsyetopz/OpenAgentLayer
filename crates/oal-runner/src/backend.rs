#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum FilterBackend {
    Rtk,
    OalCompact,
    RawBudgeted,
}

pub fn select_backend(program: &str) -> FilterBackend {
    match program {
        "cargo" | "git" | "rg" | "grep" | "cat" => FilterBackend::Rtk,
        "bun" | "npm" | "pnpm" | "yarn" | "test" | "make" => FilterBackend::OalCompact,
        _ => FilterBackend::RawBudgeted,
    }
}
