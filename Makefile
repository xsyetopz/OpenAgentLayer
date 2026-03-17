# ClaudeAgents Makefile
# Usage: make help

SHELL := /bin/bash
.DEFAULT_GOAL := help

SCRIPT_DIR := $(shell pwd)
DIST_DIR   := $(SCRIPT_DIR)/dist/claude-agents-plugin
PACKAGE    ?= pro

# ──────────────────────────────────────────────
# User targets (install, update, uninstall)
# ──────────────────────────────────────────────

.PHONY: install
install: ## Interactive install (TUI picker)
	./install.sh

.PHONY: install-global
install-global: ## Install globally to ~/.claude/ (max tier)
	./install.sh --global --max

.PHONY: install-project
install-project: ## Install to current project directory
	./install.sh . --$(PACKAGE)

.PHONY: install-plugin
install-plugin: ## Install as Claude Code plugin (marketplace format)
	@echo "Clearing cached cca plugin..."
	@rm -rf ~/.claude/plugins/cache/temp_local_*
	@if [ -d ~/.claude/plugins/marketplaces/claude-agents ]; then \
		echo "Updating marketplace copy..."; \
		rsync -a --delete --exclude='.git' ./ ~/.claude/plugins/marketplaces/claude-agents/; \
	else \
		echo "No marketplace copy found — installing fresh..."; \
		mkdir -p ~/.claude/plugins/marketplaces/claude-agents; \
		rsync -a --exclude='.git' ./ ~/.claude/plugins/marketplaces/claude-agents/; \
	fi
	claude plugin install cca
	@echo "Plugin installed from working tree."

.PHONY: update
update: ## Show diffs and selectively update installed files
	./install.sh --global --$(PACKAGE) --update

.PHONY: uninstall
uninstall: ## Uninstall from ~/.claude/
	./uninstall.sh

.PHONY: diagnose
diagnose: ## Run hook diagnostics (no install)
	./install.sh --global --diagnose

# ──────────────────────────────────────────────
# Developer targets (lint, format, build, validate)
# ──────────────────────────────────────────────

.PHONY: lint
lint: lint-shell lint-python lint-json ## Run all linters

.PHONY: lint-shell
lint-shell: ## Lint shell scripts with shellcheck
	shellcheck install.sh build-plugin.sh uninstall.sh hooks/scripts/_run.sh templates/statusline.sh

.PHONY: lint-python
lint-python: ## Lint Python with ruff
	ruff check hooks/scripts/ hooks/user/ tests/

.PHONY: lint-json
lint-json: ## Validate all JSON files parse correctly
	@echo "Validating JSON files..."
	@find . -name '*.json' -not -path './node_modules/*' -not -path './dist/*' -not -path './mcp/node_modules/*' -not -path './.git/*' | while read f; do \
		python3 -c "import json; json.load(open('$$f'))" 2>&1 || { echo "FAILED: $$f"; exit 1; }; \
	done
	@echo "All JSON valid."

.PHONY: format
format: ## Auto-format Python files
	ruff format hooks/scripts/ hooks/user/ tests/
	ruff check --fix hooks/scripts/ hooks/user/ tests/ 2>/dev/null || true

.PHONY: build
build: ## Build plugin dist (PACKAGE=pro|max)
	./build-plugin.sh $(PACKAGE)

.PHONY: build-all
build-all: ## Build plugin for all tiers and validate each
	@for pkg in pro max; do \
		echo "=== Building $$pkg ==="; \
		./build-plugin.sh $$pkg || exit 1; \
	done
	@echo "All builds passed."

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
	@python3 -c "import json; json.load(open('hooks/hooks.json'))" && echo "hooks/hooks.json regenerated."

.PHONY: clean
clean: ## Remove build artifacts and caches
	rm -rf dist/ build/ __pycache__ .pytest_cache .ruff_cache htmlcov/ .coverage
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

# ──────────────────────────────────────────────
# Test targets
# ──────────────────────────────────────────────

.PHONY: test
test: ## Run all tests
	pytest tests/ -v

.PHONY: test-quick
test-quick: ## Run tests without verbose output
	pytest tests/ -q

.PHONY: test-cov
test-cov: ## Run tests with coverage report
	pytest tests/ -v --cov=hooks/scripts --cov-report=term-missing --cov-report=html
	@echo "HTML coverage report: htmlcov/index.html"

.PHONY: test-watch
test-watch: ## Re-run tests on file changes (requires pytest-watch)
	ptw tests/ -- -v

.PHONY: test-hooks
test-hooks: diagnose ## Smoke-test installed hooks against live claude

.PHONY: test-install
test-install: ## Test install to a temp directory, then validate
	@tmpdir=$$(mktemp -d) && \
		echo "Installing to $$tmpdir ..." && \
		./install.sh "$$tmpdir" --$(PACKAGE) && \
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
	@python3 -c "import json; print(json.load(open('.claude-plugin/plugin.json'))['version'])"

# ──────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@echo "ClaudeAgents Makefile"
	@echo ""
	@echo "Usage: make <target> [PACKAGE=pro|max]"
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
