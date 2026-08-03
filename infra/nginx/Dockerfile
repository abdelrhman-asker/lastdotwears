FROM nginx:1.28.3-alpine

RUN apk add --no-cache openssl
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY 40-tls-bootstrap.sh /docker-entrypoint.d/40-tls-bootstrap.sh
RUN chmod 755 /docker-entrypoint.d/40-tls-bootstrap.sh
