
# =========================
# Base commune
# =========================
FROM node:22-alpine AS base

WORKDIR /app
RUN apk add --no-cache curl

# =========================
# Dépendances
# =========================
FROM base AS deps

COPY package*.json ./
RUN npm ci

# =========================
# Source commune (dev)
# =========================
FROM deps AS src

COPY . .

RUN chmod +x docker-entrypoint.sh

ARG DATABASE_URL
ARG DATABASE_CONSOLE_URL

ENV DATABASE_URL=${DATABASE_URL}
ENV DATABASE_CONSOLE_URL=${DATABASE_CONSOLE_URL}
RUN npx prisma generate

EXPOSE 3001
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
CMD ["npm", "run", "start:dev"]

# =========================
# BUILD (prod)
# =========================
FROM src AS build

RUN npm run build

# =========================
# RUNTIME (prod)
# =========================
FROM base AS prod

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3001 || exit 1

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
