#!/bin/sh
set -eu

certificate_directory="/etc/letsencrypt/live/$DOMAIN"

install_certificate() {
  temporary_directory=$(mktemp -d /tls/certificate.XXXXXX)
  install -m 644 "$certificate_directory/fullchain.pem" "$temporary_directory/fullchain.pem"
  install -m 600 "$certificate_directory/privkey.pem" "$temporary_directory/privkey.pem"
  mv "$temporary_directory/fullchain.pem" /tls/fullchain.pem
  mv "$temporary_directory/privkey.pem" /tls/privkey.pem
  rmdir "$temporary_directory"
  touch /tls/reload
}

if [ ! -s "$certificate_directory/fullchain.pem" ]; then
  certbot certonly --webroot --webroot-path /var/www/certbot \
    --domain "$DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email --non-interactive
  install_certificate
fi

while true; do
  certbot renew --webroot --webroot-path /var/www/certbot \
    --deploy-hook "sh /scripts/install-cert.sh" --quiet
  sleep 12h
done
