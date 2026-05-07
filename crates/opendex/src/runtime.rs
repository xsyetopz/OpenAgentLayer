#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingApproval {
    pub id: String,
    pub thread_id: String,
    pub prompt: String,
    pub resolved: bool,
    pub approved: Option<bool>,
    pub created_at_ms: u128,
    pub resolved_at_ms: Option<u128>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalInput {
    pub thread_id: String,
    pub prompt: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiveProcess {
    pub id: String,
    pub thread_id: String,
    pub pid: u32,
    pub process_group_id: Option<u32>,
    pub command: String,
    pub cwd: String,
    pub started_at_ms: u128,
    pub completed_at_ms: Option<u128>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiveProcessInput {
    pub thread_id: String,
    pub pid: u32,
    pub process_group_id: Option<u32>,
    pub command: String,
    pub cwd: String,
}
