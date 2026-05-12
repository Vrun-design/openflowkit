# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching.
# Workspace manifests (web, docs-site) are required because the root
# package.json declares them as workspaces.
COPY package.json package-lock.json ./
COPY pnpm-workspace.yaml ./
COPY web/package.json ./web/package.json
COPY docs-site/package.json ./docs-site/package.json

# CI avoids running the husky "prepare" hook
ENV CI=1

# Install using the committed package-lock.json for reproducible builds.
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Copy the rest of the source.
COPY . .

# Build the SPA (generate-sitemap -> tsc -b -> vite build)
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# SPA-aware nginx config (history API fallback + sensible caching)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3045

# Basic healthcheck against the served index
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3045/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
