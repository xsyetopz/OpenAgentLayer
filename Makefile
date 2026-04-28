.PHONY: check fmt fmt-check install-dry-run lint rscheck test

CARGO := cargo
PLATFORMS := codex claude opencode
INSTALL_FIXTURE := /tmp/OpenAgentLayer-install-fixture

check:
	$(CARGO) check --workspace
	$(CARGO) check --workspace --tests

lint: fmt-check install-dry-run
	bash -n install.sh
	$(CARGO) run -p oal-cli -- check source
	@for platform in $(PLATFORMS); do \
		$(CARGO) run -p oal-cli -- check $$platform; \
	done
	@for platform in $(PLATFORMS); do \
		$(CARGO) run -p oal-cli -- check hooks $$platform; \
	done
	$(CARGO) run -p oal-cli -- provider check
	@for platform in $(PLATFORMS); do \
		$(CARGO) run -p oal-cli -- doctor hooks $$platform; \
	done
	! rg -n 'name = "validate"|supported = false' source
	rg -n 'name = "check"' source/system.toml source/commands.toml source/skills.toml
	$(CARGO) clippy --locked --workspace -- -D warnings
	$(CARGO) clippy --locked --workspace --tests -- -D warnings

fmt:
	$(CARGO) fmt --all

fmt-check:
	$(CARGO) fmt --all -- --check

install-dry-run:
	@rm -rf "$(INSTALL_FIXTURE)"
	@mkdir -p "$(INSTALL_FIXTURE)"
	HOME="$(INSTALL_FIXTURE)/home" CODEX_HOME="$(INSTALL_FIXTURE)/codex" CLAUDE_HOME="$(INSTALL_FIXTURE)/claude" OPENCODE_CONFIG_DIR="$(INSTALL_FIXTURE)/opencode" ./install.sh --all --dry-run | tee "$(INSTALL_FIXTURE)/plan.txt"
	@for platform in codex claude; do \
		if [ "$$platform" = "codex" ]; then \
			rg -n 'would file codex .*/codex/AGENTS\.md' "$(INSTALL_FIXTURE)/plan.txt"; \
		else \
			rg -n 'would file claude .*/claude/CLAUDE\.md' "$(INSTALL_FIXTURE)/plan.txt"; \
		fi; \
		rg -n "would dir $$platform .*/$$platform/hooks" "$(INSTALL_FIXTURE)/plan.txt"; \
	done
	rg -n 'would dir opencode .*/opencode' "$(INSTALL_FIXTURE)/plan.txt"
	rg -n 'OpenAgentLayer dry-run ok: codex claude opencode' "$(INSTALL_FIXTURE)/plan.txt"

test:
	$(CARGO) test --workspace

rscheck:
	@RSCHECK_BIN="$$(command -v rscheck 2>/dev/null || true)"; \
	if [ -z "$$RSCHECK_BIN" ] && [ -x "$$HOME/.cargo/bin/rscheck" ]; then \
		RSCHECK_BIN="$$HOME/.cargo/bin/rscheck"; \
	fi; \
	if [ -z "$$RSCHECK_BIN" ] || [ ! -x "$$RSCHECK_BIN" ]; then \
		echo "rscheck not installed; run: cargo install rscheck-cli --locked"; \
		exit 1; \
	fi; \
	"$$RSCHECK_BIN" check; code=$$?; test $$code -le 1
