FROM oven/bun:1.4-alpine AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile --production

FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY package.json ./

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "apps/api/src/index.ts"]
