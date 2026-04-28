use super::run_intent;

#[test]
fn unsupported_intent_returns_failure() {
    let summary = run_intent("nope", &[]);
    assert!(!summary.ok);
    assert_eq!(summary.output, "unsupported intent");
}

#[test]
fn read_requires_path() {
    let summary = run_intent("read", &[]);
    assert!(!summary.ok);
    assert_eq!(summary.output, "missing path");
}
