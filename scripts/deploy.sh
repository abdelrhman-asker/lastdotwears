#!/bin/sh
set -eu

project_directory=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

"$project_directory/scripts/preflight.sh"

cd "$project_directory"
docker compose --env-file .env.production up --detach --build --remove-orphans --wait
docker compose --env-file .env.production ps

printf '\nDeployment is healthy at https://%s\n' "$(awk -F= '$1 == "DOMAIN" { print $2 }' .env.production | tr -d '\r')"
