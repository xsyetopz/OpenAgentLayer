use super::{CheckTarget, SourceTree};
use std::path::PathBuf;

#[test]
fn source_specs_check() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..");
    let report = SourceTree::new(root)
        .check(CheckTarget::Source)
        .expect("source check should load fixture source");
    assert_eq!(0, report.failure_count(), "{report:#?}");
}
