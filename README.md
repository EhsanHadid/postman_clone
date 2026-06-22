# Postman Clone

Postman Clone is a private API client workspace built with React + Vite, NestJS, TypeORM, MySQL, and Electron. It supports browser-based API work, desktop execution for localhost/private-network requests, shared workspaces, collections, environments, imports, backups, and request history.

Production example:

- Web: `https://postman.mahac.af`
- API: `https://postman.mahac.af/api`
- Login endpoint: `https://postman.mahac.af/api/auth/login`

## Stack

- `apps/web`: React, Vite, TypeScript, Zustand, Monaco Editor
- `apps/api`: NestJS, TypeScript, TypeORM, MySQL, cookie-backed sessions
- `apps/desktop`: Electron desktop shell for local/private-network request execution
- `packages/shared-types`: shared request, response, environment, and workspace types
- `packages/shared-utils`: interpolation and JSON helpers

## Features

- Username/password auth with database-backed sessions
- Workspace-aware collections, folders, requests, and tabs
- HTTP and tRPC request execution
- Desktop fallback for localhost and private network URLs
- Environment variables with `{{variable}}` suggestions, validation, and hover values
- Basic and Bearer auth, including collection/folder inheritance
- Backend cookie jar and request history
- Pre-request and post-response scripts in a restricted VM sandbox
- Import from backup, Postman, Insomnia, and Hoppscotch
- Workspace backup and restore
- Desktop installer download link served from backend config
- Dark UI with resizable panels

## Repository Layout

```text
postman-clone/
|-- apps/
|   |-- api/
|   |-- desktop/
|   `-- web/
|-- packages/
|   |-- shared-types/
|   `-- shared-utils/
|-- examples/
|-- .github/workflows/
|-- docker-compose.yml
`-- README.md
```

## Local Development

Install dependencies:

```bash
corepack enable
yarn install
```

Start MySQL:

```bash
docker compose up -d mysql
```

Copy the API environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Run migrations and seed data:

```bash
yarn workspace @postman-clone/api db:migrate
yarn seed
```

Start web and API:

```bash
yarn dev
```

Local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:4000/api`

Demo credentials after seeding:

- Username: `demo`
- Password: `demo123`

## Environment Variables

API variables are read from `apps/api/.env` in local development and container/Kubernetes environment variables in production.

```env
PORT=4000
APP_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_NAME=postman_clone
DB_USER=root
DB_PASSWORD=root
SESSION_COOKIE_NAME=postman_clone_session
REQUEST_BODY_LIMIT=50mb
DB_SYNCHRONIZE=false
DESKTOP_APP_DOWNLOAD_URL=
DESKTOP_APP_DOWNLOAD_URL_LINUX=
```

Important production values:

- `APP_ORIGIN`: comma-separated allowed origins, for example `https://postman.mahac.af`
- `DB_*`: MySQL connection settings
- `DB_SYNCHRONIZE`: keep `false` in production
- `REQUEST_BODY_LIMIT`: maximum JSON/form request size accepted by the API, useful for large collection imports and backup restores.
- `DESKTOP_APP_DOWNLOAD_URL`: public URL for the latest Windows desktop installer (`.exe`). The web app fetches this through `/api/app-config`.
- `DESKTOP_APP_DOWNLOAD_URL_LINUX`: public URL for the latest Linux desktop installer (`.deb`). The web app shows Windows and Debian/Ubuntu choices when download URLs are configured.
- `DOCKER_LOCALHOST_ALIAS`: set to `host.docker.internal` when the API runs in Docker and should map localhost requests to the host machine.

## Docker

Run the full stack locally:

```bash
docker compose up --build
```

Docker URLs:

- Web: `http://localhost:8080`
- API: `http://localhost:4000/api`
- MySQL: `localhost:3306`

The API container runs migrations and seed data on startup.

Build production images manually:

```bash
docker build --platform linux/arm64 -t postmanclone/web:latest -f apps/web/Dockerfile .
docker build --platform linux/arm64 -t postmanclone/api:latest -f apps/api/Dockerfile .
```

Push manually:

```bash
docker push postmanclone/web:latest
docker push postmanclone/api:latest
```

## GitHub Actions

This repository includes these workflows:

- `.github/workflows/ci.yml`: CI checks.
- `.github/workflows/docker-push.yml`: builds and pushes `postmanclone/web` and `postmanclone/api`.
- `.github/workflows/desktop-release.yml`: builds the Windows desktop installer and publishes it to a GitHub release when a release tag is pushed.
- `.github/workflows/deploy-mahac.yml`: deploys the Helm chart to the Mahac Kubernetes environment over SSH.

### Docker Push Workflow

The Docker workflow builds ARM64 images on a native ARM64 GitHub runner:

```yaml
runs-on: ubuntu-24.04-arm
platforms: linux/arm64
```

Required GitHub secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Images pushed:

- `postmanclone/web:latest`
- `postmanclone/web:<github-sha>`
- `postmanclone/api:latest`
- `postmanclone/api:<github-sha>`

### Desktop Release Workflow

The desktop workflow builds a Windows x64 installer with Electron Builder.

To publish a release, update `package.json` version and push a matching tag:

```bash
git tag v-1.0.2
git push origin v-1.0.2
```

The tag must match the root `package.json` version in this format:

```text
v-<version>
```

Output examples:

- Artifact: `postman-clone-desktop-v1.0.2-windows-x64`
- Installer file: `Postman-Clone-Desktop-v1.0.2-Windows-x64.exe`

Artifacts are retained for 90 days. Tagged releases attach the installer to the GitHub Release, which is the stable download source.

## Deployment

### 1. Prepare Production Environment

Provision:

- MySQL database
- Web host or Kubernetes ingress for `https://postman.mahac.af`
- API route under `https://postman.mahac.af/api`
- Docker registry access
- A public desktop installer URL from GitHub Releases

Production API environment example:

```env
PORT=4000
APP_ORIGIN=https://postman.mahac.af
DB_HOST=<mysql-host>
DB_PORT=3306
DB_NAME=postman_clone
DB_USER=<mysql-user>
DB_PASSWORD=<mysql-password>
DB_SYNCHRONIZE=false
SESSION_COOKIE_NAME=postman_clone_session
DESKTOP_APP_DOWNLOAD_URL=https://github.com/<owner>/<repo>/releases/download/v-1.0.2/Postman-Clone-Desktop-v1.0.2-Windows-x64.exe
```

### 2. Build and Push Images

Use GitHub Actions:

1. Configure `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.
2. Run `Docker Push` manually or push to `main`, `master`, or a `v*` tag.
3. Confirm `postmanclone/web:latest` and `postmanclone/api:latest` are available in Docker Hub.

### 3. Build Desktop Installer

Use GitHub Actions:

1. Update the root `package.json` version.
2. Push a matching tag like `v-1.0.2`.
3. Wait for `Desktop Release`.
4. Copy the `.exe` browser download URL from the GitHub Release.

### 4. Deploy to Mahac Kubernetes

The `Deploy Mahac` workflow deploys the Helm chart over SSH and injects the desktop download URL into the API environment.

Required GitHub secrets:

- `DEPLOY_SSH_HOST`
- `DEPLOY_SSH_USER`
- `DEPLOY_SSH_KEY`

Optional GitHub variables:

- `DEPLOY_SSH_PORT`, default `22`
- `DEPLOY_PATH`, default `postman-clone/helm/postman-clone`

Run deployment:

1. Go to GitHub Actions.
2. Run `Deploy Mahac`.
3. Optionally provide `desktop_download_url`.
4. If blank, the workflow tries to use the latest GitHub Release `.exe` asset.

The workflow runs:

```bash
helm dependency update
helm upgrade --install postman-clone . \
  -f values-mahac.yaml \
  -n postman-clone \
  --create-namespace \
  --set-string "api.env.DESKTOP_APP_DOWNLOAD_URL=${DESKTOP_APP_DOWNLOAD_URL}"
```

### 5. Verify Deployment

Check:

- Web loads at `https://postman.mahac.af`
- API health/auth routes are reachable under `https://postman.mahac.af/api`
- Login works with a real account
- Settings or private-network warning dialog shows the desktop download button
- `/api/app-config` returns the configured desktop installer URL
- Browser execution works for public URLs
- Localhost/private-network URLs force desktop execution

## Desktop App

The desktop app points to the deployed web/API and can execute localhost or private-network requests from the user's machine. The web app should force users to download/use the desktop app when trying to call URLs like:

- `http://localhost:3000`
- `http://127.0.0.1:8000`
- `http://192.168.x.x`
- `http://10.x.x.x`
- `http://172.16.x.x` through `http://172.31.x.x`

## Useful Commands

```bash
yarn dev
yarn build
yarn typecheck
yarn lint
yarn workspace @postman-clone/api db:migrate
yarn seed
yarn build:desktop
yarn package:desktop
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

## Imports and Backups

Supported imports:

- Backup
- Postman
- Insomnia
- Hoppscotch

Duplicate collection names are blocked in a workspace. During import, if a collection with the same name exists, the UI asks whether to add a renamed copy or merge and override the existing collection.

Sample Postman collection:

- [examples/postman-sample.collection.json](examples/postman-sample.collection.json)

## Notes

- The backend is the shared execution layer for web requests.
- The desktop app is required for localhost and private-network requests from end-user machines.
- Cookie persistence and request history are per user.
- Authentication is intentionally simple and session based.
