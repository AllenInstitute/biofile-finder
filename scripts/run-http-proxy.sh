#!/usr/bin/env bash

####
# Runs an nginx proxy in front of the file-explorer-service
# so that we can can proxy HTTP requests to the backend.
# Cannot send HTTPS requests from Electron/browser because
# the file-explorer-service is using self-signed certs.
####

# stop proxy if already running
docker stop fes-http-proxy > /dev/null 2>&1

# (re)build it
docker build -f resources/Dockerfile.dev -t fes-http-proxy resources

# (re)run it
HOST_PORT=9082
FQDN=$(hostname -f)
FILE_EXPLORER_SERVICE_HOST=$([ -z ${FILE_EXPLORER_SERVICE_HOST+x} ] && echo "$FQDN" || echo "$FILE_EXPLORER_SERVICE_HOST")
docker run -p "${HOST_PORT}:${HOST_PORT}" -e FILE_EXPLORER_SERVICE_PROXY_PORT="$HOST_PORT" -e FILE_EXPLORER_SERVICE_HOST="$FILE_EXPLORER_SERVICE_HOST" --name fes-http-proxy --rm -d fes-http-proxy