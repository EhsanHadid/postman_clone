# Postman Clone

Postman Clone is a local-first API client monorepo built with React + Vite on the frontend and NestJS + TypeORM + MySQL on the backend. It is designed for private deployment, with backend-mediated execution so cookies, request history, scripting, environment interpolation, and CORS-sensitive workflows stay centralized.

## Stack

- `apps/web`: React, Vite, TypeScript, Zustand, Monaco Editor, resizable panels
- `apps/api`: NestJS, TypeScript, TypeORM, MySQL, cookie-backed local sessions
- `packages/shared-types`: shared request, response, environment, and workspace types
- `packages/shared-utils`: interpolation and JSON helpers used by both apps

## Implemented MVP

- Local username/password auth with DB-backed sessions
- Collections, folders, request CRUD, duplication, and tabbed editing
- HTTP execution through the backend
- tRPC execution path through the backend
- Environment variables with `{{variable}}` interpolation
- Basic and Bearer auth, including inheritance from collections and folders
- Backend cookie jar with matching and persistence
- Pre-request and post-response scripts in a restricted VM sandbox
- Request history
- Postman collection import
- Workspace backup and restore
- Dark-mode UI with resizable sidebar and request/response panes

## Monorepo Layout

```text
postman-clone/
├─ apps/
│  ├─ api/
│  └─ web/
├─ packages/
│  ├─ shared-types/
│  └─ shared-utils/
├─ examples/
├─ docker-compose.yml
└─ README.md
```

## Local Development

### 1. Install dependencies

```bash
corepack enable
yarn install
```

### 2. Start MySQL

Either use your local MySQL instance or run only the database service:

```bash
docker compose up -d mysql
```

### 3. Configure environment variables

Copy the API example file:

```bash
cp apps/api/.env.example apps/api/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

### 4. Run migrations and seed data

```bash
yarn workspace @postman-clone/api db:migrate
yarn seed
```

### 5. Start the apps

```bash
yarn dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:4000/api`

Demo credentials after seeding:

- Username: `demo`
- Password: `demo123`

## Docker

Bring up the full stack:

```bash
docker compose up --build
```

- Web: `http://localhost:8080`
- API: `http://localhost:4000/api`
- MySQL: `localhost:3306`

The API container runs migrations and seed data automatically on startup, so the same demo credentials are available in Docker too:

- Username: `demo`
- Password: `demo123`

When Postman Clone runs in Docker, requests to `localhost` or `127.0.0.1` are automatically mapped to `host.docker.internal` so the executor can still reach services running on your host machine.

## Useful Commands

```bash
yarn dev
yarn build
yarn typecheck
yarn lint
yarn workspace @postman-clone/api db:migrate
yarn seed
```

## Request Scripting Helpers

Pre-request and post-response scripts run in a restricted backend VM with these helpers:

- `env.get(name)`
- `env.set(name, value)`
- `request.getHeader(name)`
- `request.setHeader(name, value)`
- `request.setBody(value)`
- `request.setUrl(value)`
- `response.status`
- `response.headers`
- `response.text()`
- `response.json()`

Example post-response script:

```js
const payload = response.json();
env.set("token", payload.accessToken);
```

## Postman Import

Use the UI button in the top bar or test with:

- [examples/postman-sample.collection.json](/E:/my_projects/postman_clone/examples/postman-sample.collection.json)

## Notes

- The backend is the execution layer for HTTP and tRPC requests.
- Cookie persistence and request history are per user.
- The current MVP keeps auth intentionally simple and avoids JWT/OAuth.
- The architecture leaves room to add gRPC/RPC later through `protocolType`.
