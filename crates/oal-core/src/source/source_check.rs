use super::SourceTree;
use crate::error::OalError;
use crate::product::{
    CLI_NAME, PRODUCT_NAME, PRODUCT_SHORT_NAME, RUNNER_NAME, TAGLINE, WINDOWS_NATIVE_BLOCKER,
};
use crate::specs::{
    CatalogSpec, IntegrationsSpec, ModelCatalog, ModelsSpec, ProductSpec, RunnerSpec,
};
use crate::validation::ValidationReport;
use std::collections::BTreeMap;

impl SourceTree {
    pub(super) fn check_source(&self) -> Result<ValidationReport, OalError> {
        let mut report = ValidationReport::new();
        self.check_product(&mut report)?;
        self.check_models(&mut report)?;
        self.check_runner(&mut report)?;
        self.check_integrations(&mut report)?;
        self.check_catalogs(&mut report)?;
        report.merge(self.check_providers()?);
        report.merge(self.check_tools()?);
        Ok(report)
    }

    fn check_product(&self, report: &mut ValidationReport) -> Result<(), OalError> {
        let product: ProductSpec = self.read_source_toml("product.toml")?;
        require_eq(
            report,
            "source/product.toml",
            "product.name",
            &product.product.name,
            PRODUCT_NAME,
        );
        require_eq(
            report,
            "source/product.toml",
            "product.short_name",
            &product.product.short_name,
            PRODUCT_SHORT_NAME,
        );
        require_eq(
            report,
            "source/product.toml",
            "product.cli",
            &product.product.cli,
            CLI_NAME,
        );
        require_eq(
            report,
            "source/product.toml",
            "product.runner",
            &product.product.runner,
            RUNNER_NAME,
        );
        require_eq(
            report,
            "source/product.toml",
            "product.tagline",
            &product.product.tagline,
            TAGLINE,
        );
        require_eq(
            report,
            "source/product.toml",
            "support.windows_native_error",
            &product.support.windows_native_error,
            WINDOWS_NATIVE_BLOCKER,
        );
        Ok(())
    }

    fn check_models(&self, report: &mut ValidationReport) -> Result<(), OalError> {
        let models: ModelsSpec = self.read_source_toml("models.toml")?;
        for model in ["gpt-5.5", "gpt-5.3-codex", "gpt-5.4-mini"] {
            require_model_id(report, "source/models.toml", &models.codex, model);
        }
        for model in [
            "opencode/nemotron-3-super-free",
            "opencode/minimax-m2.5-free",
            "opencode/ling-2.6-flash-free",
            "opencode/hy3-preview-free",
            "opencode/big-pickle",
        ] {
            require_model_id(report, "source/models.toml", &models.opencode, model);
        }
        Ok(())
    }

    fn check_runner(&self, report: &mut ValidationReport) -> Result<(), OalError> {
        let runner: RunnerSpec = self.read_source_toml("runner.toml")?;
        if !runner.command_policy.destructive_commands_require_approval {
            report.error(
                "source/runner.toml",
                "command_policy.destructive_commands_require_approval must be true",
            );
        }
        if !runner.token_accounting.track_saved_tokens {
            report.error(
                "source/runner.toml",
                "token_accounting.track_saved_tokens must be true",
            );
        }
        Ok(())
    }

    fn check_integrations(&self, report: &mut ValidationReport) -> Result<(), OalError> {
        let integrations: IntegrationsSpec = self.read_source_toml("integrations.toml")?;
        if integrations.package_managers.preferred_order.is_empty() {
            report.error(
                "source/integrations.toml",
                "package_managers.preferred_order must not be empty",
            );
        }
        require_eq(
            report,
            "source/integrations.toml",
            "package_managers.selection",
            &integrations.package_managers.selection,
            "repo-lockfile",
        );
        if !integrations.package_managers.never_coerce {
            report.error(
                "source/integrations.toml",
                "package_managers.never_coerce must be true",
            );
        }
        for install in &integrations.package_managers.install_commands {
            if install.lockfiles.is_empty() {
                report_package_install_error(report, &install.name, "lockfiles");
            }
            if install.command.is_empty() {
                report_package_install_error(report, &install.name, "command");
            }
        }
        if integrations.capabilities.rtk.is_empty() {
            report.error(
                "source/integrations.toml",
                "capabilities.rtk must not be empty",
            );
        }
        if integrations.capabilities.context7.is_empty() {
            report.error(
                "source/integrations.toml",
                "capabilities.context7 must not be empty",
            );
        }
        if integrations.capabilities.caveman.is_empty() {
            report.error(
                "source/integrations.toml",
                "capabilities.caveman must not be empty",
            );
        }
        Ok(())
    }

    fn check_catalogs(&self, report: &mut ValidationReport) -> Result<(), OalError> {
        for (file_name, display_path) in [
            ("agents.toml", "source/agents.toml"),
            ("skills.toml", "source/skills.toml"),
            ("commands.toml", "source/commands.toml"),
            ("hooks.toml", "source/hooks.toml"),
        ] {
            let spec: CatalogSpec = self.read_source_toml(file_name)?;
            require_catalog(report, display_path, &spec);
        }
        let system: CatalogSpec = self.read_source_toml("system.toml")?;
        require_catalog(report, "source/system.toml", &system);
        require_system_names(report, &system);
        self.require_system_catalog_sync(report, &system)?;
        Ok(())
    }

    fn require_system_catalog_sync(
        &self,
        report: &mut ValidationReport,
        system: &CatalogSpec,
    ) -> Result<(), OalError> {
        let commands: CatalogSpec = self.read_source_toml("commands.toml")?;
        let skills: CatalogSpec = self.read_source_toml("skills.toml")?;
        let system_items: BTreeMap<&str, &str> = system
            .items
            .iter()
            .map(|item| (item.name.as_str(), item.kind.as_str()))
            .collect();
        for item in &system.items {
            if item.name == "validate" {
                report.error(
                    "source/system.toml",
                    "system item `validate` must be `check`",
                );
            }
        }
        for item in &commands.items {
            if item.name == "validate" {
                report.error("source/commands.toml", "command `validate` must be `check`");
            }
            match system_items.get(item.name.as_str()) {
                Some(&("command" | "command-skill")) => {}
                Some(kind) => report_system_kind_error(
                    report,
                    "source/commands.toml",
                    "command",
                    &item.name,
                    kind,
                ),
                None => {
                    report_system_missing(report, "source/commands.toml", "command", &item.name);
                }
            }
        }
        for item in &skills.items {
            if item.name == "validate" {
                report.error("source/skills.toml", "skill `validate` must be `check`");
            }
            match system_items.get(item.name.as_str()) {
                Some(&("skill" | "command-skill")) => {}
                Some(kind) => report_system_kind_error(
                    report,
                    "source/skills.toml",
                    "skill",
                    &item.name,
                    kind,
                ),
                None => {
                    report_system_missing(report, "source/skills.toml", "skill", &item.name);
                }
            }
        }
        Ok(())
    }
}

fn require_eq(
    report: &mut ValidationReport,
    path: &str,
    field: &str,
    actual: &str,
    expected: &str,
) {
    if actual != expected {
        report.error(
            path,
            format!("{field} expected `{expected}`, got `{actual}`"),
        );
    }
}

fn require_model_id(
    report: &mut ValidationReport,
    path: &str,
    catalog: &ModelCatalog,
    expected: &str,
) {
    if !catalog.models.iter().any(|model| model.id == expected) {
        report.error(path, format!("missing model id `{expected}`"));
    }
}

fn require_catalog(report: &mut ValidationReport, path: &str, spec: &CatalogSpec) {
    if spec.items.is_empty() {
        report.error(path, "items must not be empty");
    }
    for item in &spec.items {
        if item.name.is_empty() {
            report.error(path, "item.name must not be empty");
        }
        if item.kind.is_empty() {
            report_item_field_empty(report, path, &item.name, "kind");
        }
        if item.route.is_empty() {
            report_item_field_empty(report, path, &item.name, "route");
        }
        if item.purpose.is_empty() {
            report_item_field_empty(report, path, &item.name, "purpose");
        }
        if path == "source/hooks.toml" && !has_category_prefix(&item.name) {
            report_hook_prefix_error(report, path, &item.name);
        }
    }
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

fn require_system_names(report: &mut ValidationReport, spec: &CatalogSpec) {
    for name in [
        "plan",
        "implement",
        "review",
        "check",
        "debug",
        "trace",
        "test",
        "document",
        "taste",
        "caveman",
        "bmad",
    ] {
        if !spec.items.iter().any(|item| item.name == name) {
            report_missing_system_item(report, name);
        }
    }
}

fn report_package_install_error(report: &mut ValidationReport, name: &str, field: &str) {
    report.error(
        "source/integrations.toml",
        format!("package manager `{name}` must declare {field}"),
    );
}

fn report_system_kind_error(
    report: &mut ValidationReport,
    path: &str,
    item_kind: &str,
    name: &str,
    actual_kind: &str,
) {
    report.error(
        path,
        format!(
            "{item_kind} `{name}` must be declared as {item_kind} in source/system.toml, got `{actual_kind}`"
        ),
    );
}

fn report_system_missing(report: &mut ValidationReport, path: &str, item_kind: &str, name: &str) {
    report.error(
        path,
        format!("{item_kind} `{name}` missing from source/system.toml"),
    );
}

fn report_item_field_empty(report: &mut ValidationReport, path: &str, name: &str, field: &str) {
    report.error(path, format!("item `{name}` {field} must not be empty"));
}

fn report_hook_prefix_error(report: &mut ValidationReport, path: &str, name: &str) {
    report.error(path, format!("hook `{name}` must use a category prefix"));
}

fn report_missing_system_item(report: &mut ValidationReport, name: &str) {
    report.error(
        "source/system.toml",
        format!("missing system item `{name}`"),
    );
}
