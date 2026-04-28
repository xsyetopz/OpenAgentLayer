pub const PRODUCT_NAME: &str = "OpenAgentLayer";
pub const PRODUCT_SHORT_NAME: &str = "OAL";
pub const CLI_NAME: &str = "oal";
pub const RUNNER_NAME: &str = "oal-runner";
pub const TAGLINE: &str = "harness layer for coding agents";
pub const WINDOWS_NATIVE_BLOCKER: &str = "OAL supports Windows through WSL2 only.";

#[must_use]
pub const fn runtime_target() -> &'static str {
    if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unsupported"
    }
}
