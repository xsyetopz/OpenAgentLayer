# ClaudeAgents Makefile
# Usage: make help

SHELL := /bin/bash
.DEFAULT_GOAL := help

SCRIPT_DIR := $(shell pwd)
DIST_DIR   := $(SCRIPT_DIR)/dist/claude-agents-plugin

# ──────────────────────────────────────────────
# User targets (install, update, uninstall)
# ──────────────────────────────────────────────

.PHONY: install
install: ## Install (max tier)
	./install.sh

.PHONY: install-global
install-global: ## Install globally to ~/.claude/
	./install.sh

.PHONY: install-plugin
install-plugin: ## Install plugin from working tree (uninstalls stale first)
	@rm -rf ~/.claude/plugins/cache/temp_local_*
	@mkdir -p ~/.claude/plugins/marketplaces/claude-agents
	@rsync -a --delete --exclude='.git' ./ ~/.claude/plugins/marketplaces/claude-agents/
	@claude plugin uninstall cca@claude-agents 2>/dev/null || true
	claude plugin install cca

.PHONY: update
update: ## Re-run install (updates all user-level files and plugin)
	./install.sh

.PHONY: uninstall
uninstall: ## Uninstall from ~/.claude/
	./uninstall.sh --global

# ──────────────────────────────────────────────
# Developer targets (lint, format, build, validate)
# ──────────────────────────────────────────────

.PHONY: lint
lint: lint-shell lint-json ## Run all linters

.PHONY: lint-shell
lint-shell: ## Lint shell scripts with shellcheck
	shellcheck install.sh build-plugin.sh uninstall.sh hooks/scripts/_run.sh statusline/statusline-command.sh

.PHONY: lint-json
lint-json: ## Validate all JSON files parse correctly
	@echo "Validating JSON files..."
	@find . -name '*.json' -not -path './node_modules/*' -not -path './dist/*' -not -path './.git/*' | while read f; do \
		node -e "JSON.parse(require('fs').readFileSync('$$f','utf8'))" 2>&1 || { echo "FAILED: $$f"; exit 1; }; \
	done
	@echo "All JSON valid."

.PHONY: format
format: ## No-op (formatting handled by project tooling)

.PHONY: build
build: ## Build plugin dist
	./build-plugin.sh

.PHONY: validate
validate: lint test build ## Full validation: lint + test + build

.PHONY: validate-dist
validate-dist: build ## Build then validate dist structure
	@echo "Checking dist structure..."
	@test -f $(DIST_DIR)/.claude-plugin/plugin.json || { echo "FAIL: missing plugin.json"; exit 1; }
	@test -f $(DIST_DIR)/hooks/hooks.json || { echo "FAIL: missing hooks.json"; exit 1; }
	@test -d $(DIST_DIR)/hooks/scripts/pre || { echo "FAIL: missing hooks/scripts/pre/"; exit 1; }
	@test -d $(DIST_DIR)/hooks/scripts/post || { echo "FAIL: missing hooks/scripts/post/"; exit 1; }
	@test -d $(DIST_DIR)/hooks/scripts/session || { echo "FAIL: missing hooks/scripts/session/"; exit 1; }
	@! grep -q 'CLAUDE_PROJECT_DIR' $(DIST_DIR)/hooks/hooks.json || { echo "FAIL: hooks.json has CLAUDE_PROJECT_DIR refs"; exit 1; }
	@grep -q 'CLAUDE_PLUGIN_ROOT' $(DIST_DIR)/hooks/hooks.json || { echo "FAIL: hooks.json missing CLAUDE_PLUGIN_ROOT refs"; exit 1; }
	@agent_count=$$(ls $(DIST_DIR)/agents/*.md 2>/dev/null | wc -l | tr -d ' '); \
		test "$$agent_count" -eq 7 || { echo "FAIL: expected 7 agents, got $$agent_count"; exit 1; }
	@skill_count=$$(ls -d $(DIST_DIR)/skills/*/ 2>/dev/null | wc -l | tr -d ' '); \
		test "$$skill_count" -ge 10 || { echo "FAIL: expected >=10 skills, got $$skill_count"; exit 1; }
	@echo "Dist validation passed."

.PHONY: hooks-json
hooks-json: ## Regenerate hooks/hooks.json from configs/base.json
	@sed 's|"$$CLAUDE_PROJECT_DIR"/.claude/hooks/scripts/|"$${CLAUDE_PLUGIN_ROOT}"/hooks/scripts/|g' \
		hooks/configs/base.json > hooks/hooks.json
	@node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'))" && echo "hooks/hooks.json regenerated."

.PHONY: clean
clean: ## Remove build artifacts and caches
	rm -rf dist/ build/ node_modules/

# ──────────────────────────────────────────────
# Test targets
# ──────────────────────────────────────────────

.PHONY: test
test: ## Run all tests
	node --test tests/test-*.mjs

.PHONY: test-quick
test-quick: ## Run tests without verbose output
	node --test tests/test-*.mjs 2>&1 | tail -5

.PHONY: test-cov
test-cov: ## Run all tests (no coverage tooling)
	node --test tests/test-*.mjs

.PHONY: test-watch
test-watch: ## Re-run tests on file changes (requires nodemon)
	nodemon --watch tests/ --watch hooks/scripts/ --ext mjs --exec 'node --test tests/test-*.mjs'

.PHONY: test-hooks
test-hooks: diagnose ## Smoke-test installed hooks against live claude

.PHONY: test-install
test-install: ## Test install to a temp directory, then validate
	@tmpdir=$$(mktemp -d) && \
		echo "Installing to $$tmpdir ..." && \
		./install.sh "$$tmpdir" && \
		echo "" && echo "Validating install..." && \
		test -f "$$tmpdir/.claude/hooks.json" && \
		test -d "$$tmpdir/.claude/agents" && \
		test -d "$$tmpdir/.claude/skills" && \
		agent_count=$$(ls "$$tmpdir/.claude/agents/"*.md 2>/dev/null | wc -l | tr -d ' ') && \
		echo "Agents: $$agent_count" && \
		skill_count=$$(ls -d "$$tmpdir/.claude/skills/"*/ 2>/dev/null | wc -l | tr -d ' ') && \
		echo "Skills: $$skill_count" && \
		echo "Install test passed." && \
		rm -rf "$$tmpdir"

.PHONY: test-plugin
test-plugin: build ## Build plugin and run with --plugin-dir
	claude --plugin-dir $(DIST_DIR) --print-plugins 2>/dev/null || echo "(--print-plugins not available, manual check needed)"
	@echo "To test manually: claude --plugin-dir $(DIST_DIR)"

# ──────────────────────────────────────────────
# Release targets
# ──────────────────────────────────────────────

.PHONY: release-check
release-check: validate validate-dist ## Full pre-release check: lint + test + build + dist validation
	@echo ""
	@echo "Pre-release checks passed. Ready to tag."

.PHONY: version
version: ## Show current plugin version
	@node -e "console.log(JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')).version)"

# ──────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@echo "ClaudeAgents Makefile"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} \
		/^[a-zA-Z_-]+:.*##/ { \
			if (section != substr(FILENAME,0,0)) { } \
			printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 \
		} \
		/^# ─/ { \
			getline; \
			if ($$0 ~ /^# /) { \
				gsub(/^# /, ""); \
				printf "\n\033[1m%s\033[0m\n", $$0 \
			} \
		}' $(MAKEFILE_LIST)
	@echo ""
