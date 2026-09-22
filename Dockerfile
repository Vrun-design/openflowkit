# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching.
# Workspace manifests are required because the root package declares them.
COPY package.json package-lock.json ./
COPY pnpm-workspace.yaml ./
COPY docs-site/package.json ./docs-site/package.json

# CI avoids running the husky prepare hook.
ENV CI=1

RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3045

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3045/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
