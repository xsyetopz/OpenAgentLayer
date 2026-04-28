use super::SourceTree;
use crate::error::OalError;
use crate::specs::PlatformSpec;
use crate::validation::ValidationReport;

impl SourceTree {
    /// Validates native hook support for a platform binary.
    ///
    /// # Errors
    ///
    /// Returns an error when the platform source file cannot be read or parsed.
    pub fn check_hooks(&self, platform: &str) -> Result<ValidationReport, OalError> {
        let spec = self.read_platform(platform)?;
        let mut report = ValidationReport::new();
        let display_path = platform_display_path(platform);
        if spec.name != platform {
            report.error(
                &display_path,
                format!("platform name expected `{platform}`, got `{}`", spec.name),
            );
        }
        if spec.hook_events.is_empty() {
            report.error(&display_path, "hook_events must not be empty");
        }
        for event in &spec.hook_events {
            if event.name.is_empty() {
                report.error(&display_path, "hook event name must not be empty");
            }
            if !has_category_prefix(&event.name) {
                report_hook_error(
                    &mut report,
                    &display_path,
                    &event.name,
                    "must use a category prefix",
                );
            }
            if !event.supported {
                report_unsupported_hook(&mut report, &display_path, &event.name);
            }
            if event.native_event.is_empty() {
                report_hook_error(
                    &mut report,
                    &display_path,
                    &event.name,
                    "native_event must not be empty",
                );
            }
            if event.supported && (event.payload.is_empty() || event.output.is_empty()) {
                report_hook_error(
                    &mut report,
                    &display_path,
                    &event.name,
                    "must define payload and output",
                );
            }
        }
        Ok(report)
    }

    pub(super) fn check_platform(&self, platform: &str) -> Result<ValidationReport, OalError> {
        let spec = self.read_platform(platform)?;
        let mut report = ValidationReport::new();
        let display_path = platform_display_path(platform);
        require_base_platform_shape(&mut report, &display_path, &spec);
        match platform {
            "codex" | "claude" => require_generated_surfaces(
                &mut report,
                &display_path,
                &spec,
                &["hooks", "skills", "agents"],
            ),
            "opencode" => require_opencode_surfaces(&mut report, &display_path, &spec),
            _ => {}
        }
        Ok(report)
    }

    fn read_platform(&self, platform: &str) -> Result<PlatformSpec, OalError> {
        self.read_source_toml(&format!("platforms/{platform}.toml"))
    }
}

fn platform_display_path(platform: &str) -> String {
    format!("source/platforms/{platform}.toml")
}

fn has_category_prefix(name: &str) -> bool {
    let Some((prefix, _suffix)) = name.split_once('-') else {
        return false;
    };
    matches!(
        prefix,
        "pre" | "post" | "prompt" | "session" | "stop" | "subagent"
    )
}

fn require_base_platform_shape(report: &mut ValidationReport, path: &str, spec: &PlatformSpec) {
    if spec.references.is_empty() {
        report.error(path, "references must not be empty");
    }
    if spec.adapter_plan.generated_paths.is_empty() {
        report.error(path, "adapter_plan.generated_paths must not be empty");
    }
    if spec.adapter_plan.install_paths.is_empty() {
        report.error(path, "adapter_plan.install_paths must not be empty");
    }
    if spec.validation.checks.is_empty() {
        report.error(path, "validation.checks must not be empty");
    }
}

fn require_generated_surfaces(
    report: &mut ValidationReport,
    path: &str,
    spec: &PlatformSpec,
    surfaces: &[&str],
) {
    for surface in surfaces {
        if !spec
            .adapter_plan
            .generated_paths
            .iter()
            .any(|item| item == surface)
        {
            report_missing_generated_surface(report, path, surface);
        }
    }
}

fn report_hook_error(report: &mut ValidationReport, path: &str, name: &str, message: &str) {
    report.error(path, format!("hook `{name}` {message}"));
}

fn report_unsupported_hook(report: &mut ValidationReport, path: &str, name: &str) {
    report.error(path, format!("unsupported hook `{name}` must be absent"));
}

fn report_missing_generated_surface(report: &mut ValidationReport, path: &str, surface: &str) {
    report.error(
        path,
        format!("adapter_plan.generated_paths missing `{surface}`"),
    );
}

fn require_opencode_surfaces(report: &mut ValidationReport, path: &str, spec: &PlatformSpec) {
    if spec.native_surfaces.permissions.is_none() {
        report.error(path, "native_surfaces.permissions missing");
    }
    if spec.native_surfaces.agents.is_none() {
        report.error(path, "native_surfaces.agents missing");
    }
    if spec.native_surfaces.skills.is_none() {
        report.error(path, "native_surfaces.skills missing");
    }
    let runner_named = spec
        .native_surfaces
        .permissions
        .as_deref()
        .is_some_and(|value| value.contains("oal-runner"));
    if !runner_named {
        report.error(path, "permissions surface must name `oal-runner`");
    }
}
