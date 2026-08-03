#!/bin/sh
set -eu

tls_directory=/etc/nginx/tls
certificate="$tls_directory/fullchain.pem"
private_key="$tls_directory/privkey.pem"
reload_marker="$tls_directory/reload"

mkdir -p "$tls_directory"

if [ ! -s "$certificate" ] || [ ! -s "$private_key" ]; then
  temporary_directory=$(mktemp -d)
  openssl req -x509 -nodes -newkey rsa:2048 -days 2 \
    -subj "/CN=${DOMAIN}" \
    -keyout "$temporary_directory/privkey.pem" \
    -out "$temporary_directory/fullchain.pem" >/dev/null 2>&1
  install -m 600 "$temporary_directory/privkey.pem" "$private_key"
  install -m 644 "$temporary_directory/fullchain.pem" "$certificate"
  rm -rf "$temporary_directory"
fi

(
  while true; do
    sleep 30
    if [ -f "$reload_marker" ]; then
      nginx -t && nginx -s reload
      rm -f "$reload_marker"
    fi
  done
) &
