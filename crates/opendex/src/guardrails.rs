#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UsageGuardrails {
    pub max_open_workers: usize,
    pub max_depth: u32,
    pub thread_unit_limit: u64,
    pub session_unit_limit: u64,
    pub stale_after_ms: u128,
}

impl Default for UsageGuardrails {
    fn default() -> Self {
        Self {
            max_open_workers: 1,
            max_depth: 1,
            thread_unit_limit: 2_000_000,
            session_unit_limit: 8_000_000,
            stale_after_ms: 30 * 60 * 1000,
        }
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ThreadUsage {
    pub thread_id: String,
    pub input_units: u64,
    pub output_units: u64,
    pub total_units: u64,
    pub last_active_ms: u128,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UsageInput {
    pub thread_id: String,
    pub input_units: u64,
    pub output_units: u64,
    pub total_units: u64,
    pub at_ms: u128,
}
