# ==========================================================================
# Stage 1: Base
# ==========================================================================
FROM node:22-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# ==========================================================================
# Stage 2: Dependencies (cached on lockfile changes only)
# ==========================================================================
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ==========================================================================
# Stage 3: Builder (Next.js build + Prisma generate)
# ==========================================================================
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
RUN pnpm build

# ==========================================================================
# Stage 4: Production dependencies only
# ==========================================================================
FROM base AS prod-deps

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

# ==========================================================================
# Stage 5: Runner (final production image)
# ==========================================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# tsx for worker mode (devDep, but worker needs it at runtime)
RUN pnpm add -g tsx

# Production node_modules (worker needs full deps)
COPY --from=prod-deps /app/node_modules ./node_modules

# Generated Prisma client (overlay onto prod node_modules)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Prisma schema + migrations (for prisma migrate deploy)
COPY --from=builder /app/prisma ./prisma

# Next.js standalone output (web mode)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Worker source files (tsx runs raw TypeScript)
COPY --from=builder /app/src/workers ./src/workers
COPY --from=builder /app/src/lib ./src/lib

# GraphQL schema (read at runtime via readFileSync)
COPY --from=builder /app/src/graphql/schema.graphql ./src/graphql/schema.graphql

# tsx needs tsconfig for @/* path alias resolution
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

# Startup script
COPY scripts/railway-start.sh ./scripts/railway-start.sh
RUN chmod +x ./scripts/railway-start.sh

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000 3001

CMD ["bash", "scripts/railway-start.sh"]
