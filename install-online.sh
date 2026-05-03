#!/usr/bin/env bash
set -euo pipefail

repo_url="${OAL_REPO_URL:-https://github.com/xsyetopz/OpenAgentLayer.git}"
ref="${OAL_REF:-master}"
install_dir="${OAL_INSTALL_DIR:-$HOME/.local/share/openagentlayer}"
tmp_root="$(mktemp -d)"

cleanup() {
  if [[ -n "${tmp_root:-}" && -d "$tmp_root" ]]; then
    perl -MFile::Path=remove_tree -e 'remove_tree($ARGV[0])' "$tmp_root"
  fi
}
trap cleanup EXIT

clone_dir="$tmp_root/openagentlayer"
stage_dir="$tmp_root/install-stage"

git clone --depth 1 --branch "$ref" "$repo_url" "$clone_dir"
git -C "$clone_dir" submodule update --init --recursive

mkdir -p "$(dirname "$install_dir")"
if [[ -e "$install_dir" && ! -f "$install_dir/.openagentlayer-install" ]]; then
  echo "error: $install_dir exists and is not marked as an OAL install." >&2
  exit 1
fi

mkdir -p "$stage_dir"
tar -C "$clone_dir" -cf - . | tar -C "$stage_dir" -xf -
printf 'installed-by=openagentlayer\n' > "$stage_dir/.openagentlayer-install"

if [[ -e "$install_dir" ]]; then
  mv "$install_dir" "$tmp_root/previous-install"
fi
mv "$stage_dir" "$install_dir"

if ! "$install_dir/install.sh" "$@"; then
  if [[ -d "$tmp_root/previous-install" ]]; then
    mv "$install_dir" "$tmp_root/failed-install"
    mv "$tmp_root/previous-install" "$install_dir"
  fi
  exit 1
fi
