#!/bin/sh
set -eu

project_directory=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

if [ "${SEED_CONFIRM:-}" != commerce ]; then
  printf 'Seeding resets the configured seed account passwords. Set SEED_CONFIRM=commerce to continue.\n' >&2
  exit 1
fi

cd "$project_directory"
docker compose --env-file .env.production run --rm migrate corepack pnpm prisma:seed
printf 'Production seed completed. Rotate the seeded passwords after the first login.\n'
