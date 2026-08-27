# Player-web production build + nginx
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/player-web/package.json apps/player-web/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/simulation-engine/package.json packages/simulation-engine/
COPY packages/game-content/package.json packages/game-content/
COPY packages/scoring-engine/package.json packages/scoring-engine/
COPY apps/api/package.json apps/api/

RUN npm ci

COPY packages packages
COPY apps/player-web apps/player-web
COPY tsconfig.base.json ./

# Same-origin /api via nginx proxy — leave VITE_API_URL empty
ENV VITE_API_URL=
ARG VITE_SERVER_SIM=0
ARG VITE_LLM_TIPS=
ENV VITE_SERVER_SIM=$VITE_SERVER_SIM
ENV VITE_LLM_TIPS=$VITE_LLM_TIPS

RUN npm run build --workspace=apps/player-web

FROM nginx:1.27-alpine

COPY apps/player-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/player-web/dist /usr/share/nginx/html

EXPOSE 80
