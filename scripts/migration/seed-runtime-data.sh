#!/usr/bin/env bash

set -euo pipefail

repo_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
repo_root="$(cd "$repo_root" && pwd)"
cd "$repo_root"

if command -v mongosh >/dev/null 2>&1; then
  mongosh "mongodb://127.0.0.1:27017" scripts/celanworksmith/seed-runtime-mongodb.js
  exit 0
fi

container_name="${MIGRATION_MONGO_CONTAINER:-appsmith-mongodb}"
if docker ps --format '{{.Names}}' | grep -qx "$container_name"; then
  docker cp scripts/celanworksmith/seed-runtime-mongodb.js "$container_name:/tmp/seed-runtime-mongodb.js"
  docker exec "$container_name" mongosh "mongodb://127.0.0.1:27017" /tmp/seed-runtime-mongodb.js
  exit 0
fi

printf 'ERROR mongosh is unavailable and MongoDB container %q is not running\n' "$container_name" >&2
printf 'Install mongosh or set MIGRATION_MONGO_CONTAINER to the running MongoDB container name\n' >&2
exit 1
