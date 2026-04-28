use super::CommandSummary;

#[test]
fn json_escapes_output() {
    let summary = CommandSummary::new("read".to_owned(), true, "a\n\"b\"".to_owned());
    assert_eq!(
        summary.to_json(),
        "{\"kind\":\"read\",\"ok\":true,\"output\":\"a\\n\\\"b\\\"\"}"
    );
}
