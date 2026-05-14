# Workspace Permissions Manual QA

Use two or more test accounts so each role can be verified from a real session.

## Backend permission checks

- Authenticated user can create a workspace and becomes the only owner.
- Workspace list only shows workspaces where the current user is a member.
- Owner can add admin, contributor, and readonly members.
- Admin can add contributor and readonly members.
- Admin cannot add, remove, or demote an owner.
- Admin cannot remove or demote another admin.
- Contributor cannot add, remove, or update members.
- Readonly cannot add, remove, or update members.
- Duplicate workspace membership is rejected.
- Owner cannot remove themself while they are the owner.
- Owner-only delete succeeds for the owner and returns 403 for all other roles.

## Workspace data scoping

- Collections list changes when the active workspace changes.
- A user cannot fetch a collection from a workspace where they are not a member.
- Owner, admin, and contributor can create, update, and delete collections.
- Readonly can view collections but cannot create, update, or delete them.
- Request and folder mutations are denied when the collection belongs to another workspace.
- Environments are loaded by active workspace.
- Owner and admin can manage workspace environments.
- Contributor and readonly users cannot mutate workspace environments.

## User search and member management UI

- User search returns only safe public fields.
- User search excludes the current user.
- User search can exclude members already in the active workspace.
- Member role controls match the current user's workspace role.
- Forbidden operations show a clear permission error.

## Desktop privacy regression checks

- Sending a live API request still uses Electron local execution.
- Request bodies are not sent to the backend for execution.
- Response bodies are not sent to the backend.
- Request/response history is saved locally only.
- Clearing local history does not call backend history endpoints.
- Workspace, collection, environment, and member sync still use backend APIs.
