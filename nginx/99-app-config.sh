#!/bin/sh
set -e
# Prefer runtime API_URL (Railway). Fallback: VITE_API_URL baked at build time.
RAW_URL="${API_URL:-${VITE_API_URL:-}}"
# Strip trailing slash to match client.resolveApiUrl()
API_URL=$(printf '%s' "$RAW_URL" | sed 's|/*$||')
echo "window.__APP_CONFIG__ = { API_URL: \"${API_URL}\" };" > /usr/share/nginx/html/config.js
echo "config.js written with API_URL=${API_URL}"
