# YieldMind API — Production Dockerfile
# Deploy to Railway, Fly.io, Render, or any Docker host

FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# ── Dependencies ───────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY packages/db/package.json           ./packages/db/
COPY packages/shared/package.json       ./packages/shared/
COPY packages/agent/package.json        ./packages/agent/
COPY apps/api/package.json              ./apps/api/

RUN pnpm install --frozen-lockfile

# ── Build ──────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules        ./node_modules
COPY --from=deps /app/packages/db/node_modules     ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/agent/node_modules  ./packages/agent/node_modules
COPY --from=deps /app/apps/api/node_modules        ./apps/api/node_modules

COPY tsconfig.json                        ./
COPY packages/db/                         ./packages/db/
COPY packages/shared/                     ./packages/shared/
COPY packages/agent/                      ./packages/agent/
COPY apps/api/                            ./apps/api/

WORKDIR /app/apps/api
RUN pnpm build

# ── Production image ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy what's needed to run
COPY --from=builder /app/apps/api/dist           ./dist
COPY --from=builder /app/apps/api/package.json   ./
COPY --from=builder /app/apps/api/node_modules   ./node_modules

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
