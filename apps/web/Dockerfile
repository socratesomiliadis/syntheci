FROM node:22-alpine

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/ai/package.json ./packages/ai/package.json

RUN pnpm install --frozen-lockfile=false

COPY . .

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN pnpm --filter @syntheci/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@syntheci/web", "start"]
