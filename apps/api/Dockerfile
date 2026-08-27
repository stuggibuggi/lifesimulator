# GOAL API — Node + shared simulation engine bundle
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/simulation-engine/package.json packages/simulation-engine/
COPY packages/game-content/package.json packages/game-content/
COPY packages/scoring-engine/package.json packages/scoring-engine/
COPY apps/player-web/package.json apps/player-web/

RUN npm ci

COPY packages packages
COPY apps/api apps/api
COPY tsconfig.base.json ./

# Ensure content seed JSON exists for runtime seed:content
RUN npm run content:seed:export --workspace=@goal/game-content || true

WORKDIR /app/apps/api
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
