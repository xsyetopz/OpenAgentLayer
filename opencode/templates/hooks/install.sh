#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

if [ ! -d "$GIT_HOOKS_DIR" ]; then
	mkdir -p "$GIT_HOOKS_DIR"
fi

echo "Installing git hooks..."

if [ -f "$GIT_HOOKS_DIR/pre-commit" ]; then
	echo "Backing up existing pre-commit hook..."
	mv "$GIT_HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit.bak"
fi

cp "$SCRIPT_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
chmod +x "$GIT_HOOKS_DIR/pre-commit"
echo "✓ Installed pre-commit hook"

if [ -f "$GIT_HOOKS_DIR/pre-push" ]; then
	echo "Backing up existing pre-push hook..."
	mv "$GIT_HOOKS_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push.bak"
fi

cp "$SCRIPT_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push"
chmod +x "$GIT_HOOKS_DIR/pre-push"
echo "✓ Installed pre-push hook"

echo ""
echo "Git hooks installed successfully!"
echo "Hooks are located in: $GIT_HOOKS_DIR"
