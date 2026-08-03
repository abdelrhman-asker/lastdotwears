#!/bin/sh
set -eu
umask 077

project_directory=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
environment_file="$project_directory/.env.production"
backup_directory=${BACKUP_DIRECTORY:-"$project_directory/backups"}

[ -f "$environment_file" ] || { printf '.env.production is missing.\n' >&2; exit 1; }
mkdir -p "$backup_directory"

read_environment_value() {
  awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); result = $0 } END { print result }' \
    "$environment_file" | tr -d '\r'
}

database_name=$(read_environment_value POSTGRES_DB)
database_user=$(read_environment_value POSTGRES_USER)
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_directory/${database_name}_${timestamp}.dump"
temporary_file="$backup_file.partial"

cleanup() {
  rm -f "$temporary_file"
}
trap cleanup EXIT HUP INT TERM

cd "$project_directory"
docker compose --env-file .env.production exec -T db \
  pg_dump --username="$database_user" --dbname="$database_name" \
  --format=custom --compress=9 --no-owner --no-acl > "$temporary_file"

mv "$temporary_file" "$backup_file"
trap - EXIT HUP INT TERM

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$backup_directory" && sha256sum "$(basename "$backup_file")" > "$(basename "$backup_file").sha256")
fi

printf 'Encrypted storage is still recommended. Database backup created: %s\n' "$backup_file"
