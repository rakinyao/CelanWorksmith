#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ -n "$(git status --porcelain)" ]]; then
  printf 'ERROR Working tree is not clean. Commit or intentionally resolve all changes first.\n' >&2
  git status --short
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
output_dir="${1:-${HOME}/celanworksmith-migration-${timestamp}}"
mkdir -p "$output_dir"

commit="$(git rev-parse HEAD)"
branch="$(git branch --show-current)"
branch_slug="${branch//\//-}"
bundle_path="$output_dir/CelanWorksmith-${branch_slug}-${commit:0:12}.bundle"
archive_path="$output_dir/CelanWorksmith-${commit:0:12}.tar.gz"

git bundle create "$bundle_path" --all
git archive --format=tar.gz --prefix="CelanWorksmith-${commit:0:12}/" HEAD > "$archive_path"

{
  printf 'created_at=%s\n' "$(date --iso-8601=seconds)"
  printf 'repository=%s\n' "$(git config --get remote.origin.url || true)"
  printf 'branch=%s\n' "$branch"
  printf 'commit=%s\n' "$commit"
  printf 'mongo_application_data=NOT_INCLUDED\n'
  printf 'redis_data=NOT_INCLUDED\n'
  printf 'ignored_build_artifacts=NOT_INCLUDED\n'
  printf 'runtime_seed=tracked scripts/celanworksmith/seed-runtime-mongodb.js\n'
  printf 'restore_entrypoint=scripts/migration/initialize-new-wsl.sh\n'
} > "$output_dir/MIGRATION-MANIFEST.txt"

git log -20 --oneline --decorate > "$output_dir/recent-commits.txt"
git status --short > "$output_dir/source-status.txt"
sha256sum "$bundle_path" "$archive_path" "$output_dir/MIGRATION-MANIFEST.txt" > "$output_dir/SHA256SUMS"

printf 'Migration bundle created: %s\n' "$output_dir"
printf 'No MongoDB, Redis, .env, node_modules, target, dist, or runtime log data was copied.\n'
