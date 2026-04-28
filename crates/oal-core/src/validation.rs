#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum Severity {
    Error,
    Warning,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct ValidationFinding {
    pub severity: Severity,
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone, Default, Eq, PartialEq)]
pub struct ValidationReport {
    findings: Vec<ValidationFinding>,
}

impl ValidationReport {
    #[must_use]
    pub const fn new() -> Self {
        Self {
            findings: Vec::new(),
        }
    }

    pub fn error(&mut self, path: impl Into<String>, message: impl Into<String>) {
        self.findings.push(ValidationFinding {
            severity: Severity::Error,
            path: path.into(),
            message: message.into(),
        });
    }

    pub fn warning(&mut self, path: impl Into<String>, message: impl Into<String>) {
        self.findings.push(ValidationFinding {
            severity: Severity::Warning,
            path: path.into(),
            message: message.into(),
        });
    }

    pub fn merge(&mut self, mut report: Self) {
        self.findings.append(&mut report.findings);
    }

    #[must_use]
    pub fn findings(&self) -> &[ValidationFinding] {
        &self.findings
    }

    #[must_use]
    pub fn failure_count(&self) -> usize {
        self.findings
            .iter()
            .filter(|finding| finding.severity == Severity::Error)
            .count()
    }

    #[must_use]
    pub fn is_success(&self) -> bool {
        self.failure_count() == 0
    }
}
