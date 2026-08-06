# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# TTR ONE — Web image (Nuxt 3 SPA, ssr:false)
# Builds the static SPA and serves it with nginx. The API base URL is baked
# in at BUILD time (Nuxt public runtime config for SPA), so pass it as a
# build arg: --build-arg NUXT_PUBLIC_API_BASE=https://app.example.com/api/v1
# ---------------------------------------------------------------------------

# ----- Stage 1: builder -----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ARG NUXT_PUBLIC_API_BASE=http://localhost:3000/api/v1
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Produces the static SPA under .output/public (ssr:false).
RUN npm run build

# ----- Stage 2: runtime — nginx serving static output -----
FROM nginx:1.27-alpine AS runtime

# SPA-aware nginx config: real files first, otherwise fall back to index.html.
RUN printf '%s\n' \
  'server {' \
  '  listen 8080;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  gzip on;' \
  '  gzip_types text/css application/javascript application/json image/svg+xml;' \
  '  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; try_files $uri =404; }' \
  '  location /_nuxt/  { expires 1y; add_header Cache-Control "public, immutable"; try_files $uri =404; }' \
  '  location / { try_files $uri $uri/ /index.html; }' \
  '}' > /etc/nginx/conf.d/default.conf \
  && rm -f /etc/nginx/conf.d/default.conf.default 2>/dev/null || true

COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
