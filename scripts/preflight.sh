#!/bin/sh
set -eu

project_directory=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
environment_file="$project_directory/.env.production"

fail() {
  printf 'Preflight failed: %s\n' "$1" >&2
  exit 1
}

read_environment_value() {
  variable_name=$1
  value=$(awk -F= -v key="$variable_name" '
    $1 == key {
      sub(/^[^=]*=/, "")
      result = $0
    }
    END { print result }
  ' "$environment_file" | tr -d '\r')

  case "$value" in
    \"*\") value=${value#\"}; value=${value%\"} ;;
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac

  printf '%s' "$value"
}

[ -f "$environment_file" ] || fail "copy .env.production.example to .env.production first."
command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker compose version >/dev/null 2>&1 || fail "the Docker Compose plugin is unavailable."
docker info >/dev/null 2>&1 || fail "the Docker daemon is not running or is inaccessible."

compose_version=$(docker compose version --short | sed 's/^v//')
compose_major=${compose_version%%.*}
compose_remainder=${compose_version#*.}
compose_minor=${compose_remainder%%.*}
case "$compose_major.$compose_minor" in
  *[!0-9.]*) fail "unable to parse Docker Compose version $compose_version." ;;
esac
if [ "$compose_major" -lt 2 ] || { [ "$compose_major" -eq 2 ] && [ "$compose_minor" -lt 20 ]; }; then
  fail "Docker Compose 2.20 or newer is required (found $compose_version)."
fi

required_variables='DOMAIN LETSENCRYPT_EMAIL POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD COOKIE_SECRET JWT_ACCESS_SECRET REFRESH_TOKEN_PEPPER ONE_TIME_TOKEN_PEPPER MAIL_FROM_EMAIL SMTP_HOST SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD SEED_CUSTOMER_EMAIL SEED_CUSTOMER_PASSWORD'

for variable_name in $required_variables; do
  value=$(read_environment_value "$variable_name")
  [ -n "$value" ] || fail "$variable_name is missing or empty."
done

domain=$(read_environment_value DOMAIN)
printf '%s' "$domain" | grep -Eq '^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$' \
  || fail "DOMAIN must be a hostname without a scheme, path, port, or wildcard."

database_password=$(read_environment_value POSTGRES_PASSWORD)
printf '%s' "$database_password" | grep -Eq '^[A-Za-z0-9_-]{32,}$' \
  || fail "POSTGRES_PASSWORD must contain at least 32 URL-safe characters (A-Z, a-z, 0-9, _ or -)."

for variable_name in POSTGRES_DB POSTGRES_USER; do
  value=$(read_environment_value "$variable_name")
  printf '%s' "$value" | grep -Eq '^[A-Za-z0-9_]+$' \
    || fail "$variable_name may contain only letters, numbers, and underscores."
done

for variable_name in LETSENCRYPT_EMAIL MAIL_FROM_EMAIL SEED_ADMIN_EMAIL SEED_CUSTOMER_EMAIL; do
  value=$(read_environment_value "$variable_name")
  printf '%s' "$value" | grep -Eq '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' \
    || fail "$variable_name is not a valid email address."
done

for variable_name in COOKIE_SECRET JWT_ACCESS_SECRET REFRESH_TOKEN_PEPPER ONE_TIME_TOKEN_PEPPER; do
  value=$(read_environment_value "$variable_name")
  minimum_length=64
  [ "$variable_name" = COOKIE_SECRET ] && minimum_length=32
  [ "${#value}" -ge "$minimum_length" ] || fail "$variable_name is shorter than $minimum_length characters."
done

for variable_name in SEED_ADMIN_PASSWORD SEED_CUSTOMER_PASSWORD; do
  value=$(read_environment_value "$variable_name")
  [ "${#value}" -ge 12 ] || fail "$variable_name must contain at least 12 characters."
  printf '%s' "$value" | grep -q '[a-z]' || fail "$variable_name needs a lowercase letter."
  printf '%s' "$value" | grep -q '[A-Z]' || fail "$variable_name needs an uppercase letter."
  printf '%s' "$value" | grep -q '[0-9]' || fail "$variable_name needs a number."
  printf '%s' "$value" | grep -q '[^A-Za-z0-9]' || fail "$variable_name needs a symbol."
done

if grep -Eqi 'replace-with|example\.com|change-me|your-secret' "$environment_file"; then
  fail ".env.production still contains example or placeholder values."
fi

available_kilobytes=$(df -Pk "$project_directory" | awk 'NR == 2 { print $4 }')
[ "${available_kilobytes:-0}" -ge 5242880 ] || fail "at least 5 GiB of free disk space is required."

(cd "$project_directory" && docker compose --env-file .env.production config --quiet) \
  || fail "Docker Compose configuration is invalid."

printf 'Preflight passed for %s.\n' "$domain"
