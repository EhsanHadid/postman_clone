ARG NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine

FROM ${NODE_IMAGE} AS builder

WORKDIR /app
RUN corepack enable

COPY package.json yarn.lock tsconfig.base.json .eslintrc.cjs ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json

RUN yarn install

COPY apps/api apps/api
COPY packages/shared-types packages/shared-types
COPY packages/shared-utils packages/shared-utils

RUN yarn build:packages && yarn workspace @postman-clone/api build

FROM ${NODE_IMAGE} AS runner

WORKDIR /app
RUN corepack enable

COPY package.json yarn.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json

RUN yarn install --production=true

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=builder /app/packages/shared-utils/dist packages/shared-utils/dist

EXPOSE 4000

CMD ["sh", "-c", "MIGRATE_PATH='apps/api/dist/database/migrate.js'; SEED_PATH='apps/api/dist/database/seed.js'; MAIN_PATH='apps/api/dist/main.js'; if [ ! -f \"$MIGRATE_PATH\" ]; then MIGRATE_PATH='apps/api/dist/apps/api/src/database/migrate.js'; fi; if [ ! -f \"$SEED_PATH\" ]; then SEED_PATH='apps/api/dist/apps/api/src/database/seed.js'; fi; if [ ! -f \"$MAIN_PATH\" ]; then MAIN_PATH='apps/api/dist/apps/api/src/main.js'; fi; node \"$MIGRATE_PATH\" && node \"$SEED_PATH\" && node \"$MAIN_PATH\""]
