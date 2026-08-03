#!/bin/sh
set -eu

certificate_directory="/etc/letsencrypt/live/$DOMAIN"
temporary_directory=$(mktemp -d /tls/certificate.XXXXXX)
install -m 644 "$certificate_directory/fullchain.pem" "$temporary_directory/fullchain.pem"
install -m 600 "$certificate_directory/privkey.pem" "$temporary_directory/privkey.pem"
mv "$temporary_directory/fullchain.pem" /tls/fullchain.pem
mv "$temporary_directory/privkey.pem" /tls/privkey.pem
rmdir "$temporary_directory"
touch /tls/reload
