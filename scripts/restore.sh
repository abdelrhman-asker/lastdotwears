#!/bin/sh
set -eu

project_directory=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
environment_file="$project_directory/.env.production"
backup_file=${1:-}

if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
  printf 'Usage: RESTORE_CONFIRM=commerce %s /absolute/path/to/backup.dump\n' "$0" >&2
  exit 1
fi

if [ "${RESTORE_CONFIRM:-}" != commerce ]; then
  printf 'Restore replaces the current database. Set RESTORE_CONFIRM=commerce to continue.\n' >&2
  exit 1
fi

[ -f "$environment_file" ] || { printf '.env.production is missing.\n' >&2; exit 1; }

read_environment_value() {
  awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); result = $0 } END { print result }' \
    "$environment_file" | tr -d '\r'
}

database_name=$(read_environment_value POSTGRES_DB)
database_user=$(read_environment_value POSTGRES_USER)
backup_directory=$(CDPATH= cd -- "$(dirname -- "$backup_file")" && pwd)
backup_name=$(basename "$backup_file")
backup_file="$backup_directory/$backup_name"

if [ -f "$backup_file.sha256" ] && command -v sha256sum >/dev/null 2>&1; then
  (cd "$backup_directory" && sha256sum --check "$backup_name.sha256")
fi

cd "$project_directory"
docker compose --env-file .env.production stop api web

restart_application() {
  docker compose --env-file .env.production up --detach api web nginx >/dev/null 2>&1 || true
}
trap restart_application EXIT HUP INT TERM

docker compose --env-file .env.production exec -T db \
  pg_restore --username="$database_user" --dbname="$database_name" \
  --clean --if-exists --no-owner --no-acl --single-transaction < "$backup_file"

docker compose --env-file .env.production run --rm migrate
docker compose --env-file .env.production up --detach --wait api web nginx

trap - EXIT HUP INT TERM
printf 'Database restored from %s and application health checks passed.\n' "$backup_file"
