#!/bin/sh
set -e

envsubst '${BACKEND_URL}' < /etc/nginx/nginx.template.conf > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
