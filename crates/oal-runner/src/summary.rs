#[derive(Debug, PartialEq, Eq)]
pub struct CommandSummary {
    pub kind: String,
    pub ok: bool,
    pub output: String,
}

fn escape_json(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
}

impl CommandSummary {
    #[must_use]
    pub const fn new(kind: String, ok: bool, output: String) -> Self {
        Self { kind, ok, output }
    }

    #[must_use]
    pub fn to_json(&self) -> String {
        format!(
            "{{\"kind\":\"{}\",\"ok\":{},\"output\":\"{}\"}}",
            escape_json(&self.kind),
            self.ok,
            escape_json(&self.output)
        )
    }
}

#[cfg(test)]
mod tests;
