ARG NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine
ARG NGINX_IMAGE=public.ecr.aws/docker/library/nginx:1.27-alpine

FROM ${NODE_IMAGE} AS builder

WORKDIR /app
RUN corepack enable

COPY package.json yarn.lock tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json

RUN yarn install

COPY apps/web apps/web
COPY packages/shared-types packages/shared-types
COPY packages/shared-utils packages/shared-utils

RUN yarn build:packages && yarn workspace @postman-clone/web build

FROM ${NGINX_IMAGE} AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
