# ============================================================
# Domipack — Dockerfile production (multi-stage)
# ============================================================
# Build Next.js standalone → image runtime minimaliste (~150MB)
# Basé sur la doc officielle Next.js Docker, adapté pour pnpm + Prisma v7.
# ============================================================

# ──────────────────────────────────────────────
# Stage 1 — Installation des dépendances
# ──────────────────────────────────────────────
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copier uniquement les manifests pour exploiter le cache Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

# Installer TOUTES les deps (prod + dev pour le build)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ──────────────────────────────────────────────
# Stage 2 — Build Next.js
# ──────────────────────────────────────────────
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'env de build (Next.js les inline au build)
# Pas de secrets ici — seulement des vars publiques
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Générer le client Prisma AVANT le build (types requis par TypeScript)
RUN npx prisma generate

RUN pnpm build

# ──────────────────────────────────────────────
# Stage 3 — Runtime minimaliste
# ──────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Créer un utilisateur non-root pour la sécurité
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Copier le build standalone (server.js autonome)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Fichiers de traduction next-intl (non inclus automatiquement dans standalone)
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages

# Copier le client Prisma généré
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# nodemailer est un serverExternalPackage — il doit être présent
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/nodemailer ./node_modules/nodemailer

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Healthcheck basique
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
