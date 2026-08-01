FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json config.json ./
COPY src/ ./src/
COPY generated/ ./generated/

RUN pnpm install --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "serve"]
