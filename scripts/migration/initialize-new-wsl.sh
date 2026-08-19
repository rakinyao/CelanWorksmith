#!/usr/bin/env bash

set -euo pipefail

repo_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
repo_root="$(cd "$repo_root" && pwd)"
cd "$repo_root"

if [[ ! -f app/server/envs/dev.env.example ]]; then
  printf 'ERROR Run this script from the repository root\n' >&2
  exit 1
fi

"$repo_root/scripts/migration/check-wsl-prerequisites.sh"

git_root="${HOME}/.local/share/celanworksmith/git-storage"
mkdir -p "$git_root"

if [[ ! -f app/server/.env ]]; then
  cp app/server/envs/dev.env.example app/server/.env
  sed -i "s|^APPSMITH_GIT_ROOT=.*|APPSMITH_GIT_ROOT=${git_root}|" app/server/.env
  printf '\nPORT=8081\n' >> app/server/.env
  printf 'Created app/server/.env with fresh development-only settings\n'
else
  printf 'Kept existing app/server/.env; review it manually for this machine\n'
fi

if [[ ! -f app/client/packages/rts/.env ]]; then
  cp app/client/packages/rts/.env.example app/client/packages/rts/.env
  printf 'Created app/client/packages/rts/.env\n'
else
  printf 'Kept existing app/client/packages/rts/.env\n'
fi

if [[ ! -d app/client/node_modules ]]; then
  printf 'Installing client dependencies\n'
  (cd app/client && yarn install --immutable)
else
  printf 'Kept existing app/client/node_modules\n'
fi

if [[ ! -d app/client/packages/rts/node_modules ]]; then
  printf 'Installing workspace dependencies\n'
  (cd app/client && yarn install --immutable)
else
  printf 'Kept existing app/client/packages/rts/node_modules\n'
fi

printf '\nInitialization complete.\n'
printf 'Next steps:\n'
printf '  1. Start MongoDB and Redis.\n'
printf '  2. Seed only the demo runtime data with scripts/migration/seed-runtime-data.sh.\n'
printf '  3. Build the backend with app/server/build.sh -DskipTests.\n'
printf '  4. Start RTS before the backend, then start the frontend.\n'
