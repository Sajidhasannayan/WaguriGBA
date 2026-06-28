# Multi-stage build for the TanStack Start app, runs on any Node host (Render, Fly, Railway, VPS).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV DEPLOY_TARGET=node
RUN npm run build:node

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
